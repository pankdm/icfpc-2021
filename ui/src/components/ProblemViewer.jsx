import React, { useCallback, useMemo, useRef, useState } from 'react'
import _ from 'lodash'
import AspectRatioBox from './AspectRatioBox.jsx'
import Spacer from './Spacer.jsx'
import Flex from './Flex.jsx'
import TrafficLight from './TrafficLight.jsx'
import Bonuses from './svg/Bonuses.jsx'
import Group from './svg/Group.jsx'
import Grid from './svg/Grid.jsx'
import Hole from './svg/Hole.jsx'
import Figure from './svg/Figure.jsx'
import styles from './ProblemViewer.module.css'
import { getDistanceMap, getDistances, getScore, snapVecs, vecAdd, vecSub, vecMult, vecNorm } from '../utils/graph.js'
import { inflateLoop, inflateSimpleRadialLoop, relaxLoop, gravityLoop, applyShake } from '../utils/physics.js'
import { useOnChangeValues } from '../utils/useOnChange.js'
import useAnimLoop from '../utils/useAnimLoop.js'
import { useHotkeys } from 'react-hotkeys-hook'
import useDrag from '../utils/useDrag.js'
import useBlip from '../utils/useBlip.js'
import useDebounce from '../utils/useDebounce.js'
import useLocalStorage from '../utils/useLocalStorage.js'
import useDOMEvent from '../utils/useDOMEvent.js'


export default function ProblemViewer({ problemId, problem, solution, onSaveSolution, stats, ...props }) {
  const { hole, epsilon, figure, bonuses } = problem
  const epsilonFraction = epsilon/1e6
  const zeroPointLocation = useRef()
  const getZeroPointClientLocation = () => {
    const zeroPoint = zeroPointLocation.current
    if (!zeroPoint) {
      return { clientX: 0, clientY: 0 }
    }
    const rect = zeroPoint.getBoundingClientRect()
    return { clientX: rect.left, clientY: rect.top }
  }
  const svgRef = useRef()
  const getSvgRect = () => {
    const svg = svgRef.current
    if (!svg) {
      return null
    }
    return svg.getBoundingClientRect()
  }
  const [username, setUsername] = useLocalStorage('username', 'Snake-n-Lambda')
  const overriddenVertices = useRef(null)
  const [zoom, setZoom] = useState(0)
  const [dragMode, setDragMode] = useState(true)
  const [saved, toggleSaved] = useBlip(300)
  const zoomScale = 2**-zoom
  const [panDragStartPoint, setPanDragStartPoint] = useState(null)
  const [panDragStartOffset, setPanDragStartOffset] = useState(null)
  const [multiselectMode, setMultiselectMode] = useState(false)
  const [powerClickMode, setPowerClickMode] = useState(false)
  const [panOffset, setPanOffset] = useState([0, 0])
  const [overriddenVerticesKey, setOverriddenVerticesKey] = useState(null)
  const [simMode, setSimMode] = useState(null)
  const [frozenFigurePoints, setFrozenFigurePoints] = useState(new Set())
  const addFrozenFigurePoint = (idx) => {
    const newSet = new Set(frozenFigurePoints)
    newSet.add(idx)
    setFrozenFigurePoints(newSet)
  }
  const removeFrozenFigurePoint = (idx) => {
    const newSet = new Set(frozenFigurePoints)
    newSet.delete(idx)
    setFrozenFigurePoints(newSet)
  }
  const clearFrozenFigurePoints = () => setFrozenFigurePoints(new Set())
  const unselectAllGluedPoints = () => {
    stopPlaying()
    clearFrozenFigurePoints()
  }
  const minCoord = _.min([..._.flatten(hole), ..._.flatten(figure.vertices)])
  const maxCoord = _.max([..._.flatten(hole), ..._.flatten(figure.vertices)])
  const safePadding = 5
  const xMin = minCoord - safePadding
  const yMin = minCoord - safePadding
  const xMax = maxCoord + safePadding
  const yMax = maxCoord + safePadding
  const xMean = (maxCoord - minCoord) / 2
  const yMean = (maxCoord - minCoord) / 2
  const clientPointToLocalSpacePoint = (clientPoint, ignorePan=false) => {
    const { clientX: zeroX, clientY: zeroY } = getZeroPointClientLocation()
    const zeroPoint = [zeroX, zeroY]
    const svgRect = getSvgRect()
    const xScale = (xMax-xMin)*zoomScale/svgRect.width
    const x = (clientPoint[0])*xScale
    const yScale = (yMax-yMin)*zoomScale/svgRect.height
    const y = (clientPoint[1])*yScale
    return ignorePan ? [x, y] : vecAdd([x, y], panOffset)
  }
  const clientDeltaToLocalSpaceDelta = (clientDelta) => {
    const svgRect = getSvgRect()
    const xScale = (xMax-xMin)*zoomScale/svgRect.width
    const dx = clientDelta[0]*xScale
    const yScale = (yMax-yMin)*zoomScale/svgRect.height
    const dy = clientDelta[1]*yScale
    return [dx, dy]
  }
  useDrag(svgRef, [zoomScale, panDragStartPoint, panDragStartOffset, panOffset, dragMode], {
    onDragStart: (ev) => {
      if (dragMode) {
        const x = ev.clientX
        const y = ev.clientY
        const localPoint = clientPointToLocalSpacePoint([x, y], true)
        setPanDragStartPoint(localPoint)
        setPanDragStartOffset(panOffset)
      }
    },
    onDrag: (ev) => {
      if (dragMode) {
        const x = ev.clientX
        const y = ev.clientY
        if (panDragStartPoint && panDragStartOffset) {
          const localPoint = clientPointToLocalSpacePoint([x, y], true)
          const panDragOffset = vecSub(localPoint, panDragStartPoint)
          const newPanOffset = vecAdd(panDragOffset, panDragStartOffset)
          setPanOffset(newPanOffset)
        }
      }
    },
    onDragEnd: (ev) => {
      if (dragMode) {
        const x = ev.clientX
        const y = ev.clientY
        if (panDragStartPoint && panDragStartOffset) {
          const localPoint = clientPointToLocalSpacePoint([x, y], true)
          const panDragOffset = vecSub(localPoint, panDragStartPoint)
          const newPanOffset = vecAdd(panDragOffset, panDragStartOffset)
          setPanOffset(newPanOffset)
        }
        setPanDragStartPoint(null)
        setPanDragStartOffset(null)
      }
    },
  })
  const optimalDistancesMap = useMemo(() => {
    return getDistanceMap(figure.vertices, figure.edges)
  }, [figure])
  const getCurrentVertices = () => overriddenVertices.current || (solution && solution.vertices) || figure.vertices
  const currentVertices = getCurrentVertices()
  const currentDistances = useMemo(() => {
    return getDistances(currentVertices, figure.edges)
  }, [currentVertices, figure])
  const [
    edgeStretches,
    overstretchedEdges,
    overshrinkedEdges,
  ] = useMemo(() => {
    const stretches = _.fromPairs(figure.edges.map(([v1, v2], idx) => {
      const currentDistance = currentDistances[idx]
      const originalDistance = optimalDistancesMap[v1][v2]
      return [idx, currentDistance / originalDistance]
    }))
    return [
      _.values(stretches),
      _.pickBy(stretches, (v) => v * v > 1+epsilonFraction),
      _.pickBy(stretches, (v) => v * v < 1-epsilonFraction),
    ]
  }, [figure, optimalDistancesMap, currentDistances, epsilon])
  const hasBrokenEdges = _.size(overstretchedEdges) > 0 || _.size(overshrinkedEdges) > 0
  const debncHasBrokenEdges = useDebounce(hasBrokenEdges, hasBrokenEdges ? 0 : 500)
  const score = useMemo(() => {
    return Math.floor(getScore(hole, currentVertices))
  }, [currentVertices, hole])
  const setOverriddenVertices = (vertices) => {
    overriddenVertices.current = vertices
    setOverriddenVerticesKey(vertices ? Math.random() : null)
  }
  const updateVerticePosition = (idx, newPos) => {
    let vertices = getCurrentVertices()
    vertices = [
      ...vertices.slice(0, idx),
      vecAdd(vertices[idx], newPos),
      ...vertices.slice(idx+1),
    ]
    setOverriddenVertices(vertices)
  }
  const { playing, togglePlaying, stopPlaying } = useAnimLoop(() => {
    let vertices = getCurrentVertices()
    const frozenPoints = frozenFigurePoints
    if (simMode == 'inflate') {
      vertices = inflateLoop(vertices, { optimalDistancesMap, frozenPoints })
    }
    if (simMode == 'simpleInflate') {
      vertices = inflateSimpleRadialLoop(vertices, { optimalDistancesMap, frozenPoints })
    }
    if (simMode == 'gravity') {
      vertices = gravityLoop(vertices, { gravityCenter: [xMean, yMean], frozenPoints })
    }
    vertices = relaxLoop(vertices, { optimalDistancesMap, frozenPoints })
    setOverriddenVertices(vertices)
  }, {}, [frozenFigurePoints, simMode, optimalDistancesMap, xMean, yMean])
  const toggleSimMode = (mode) => {
    if (mode != simMode) {
      setSimMode(mode)
      if (!playing) {
        togglePlaying()
      }
    } else {
      setSimMode(null)
    }
  }
  const toggleDragMode = () => {
    if (dragMode == true) {
      setDragMode(false)
    } else {
      setDragMode(true)
    }
  }
  const singleShake = () => {
    let vertices = currentVertices
    vertices = applyShake(vertices, { maxAmplitude: 3, frozenPoints: frozenFigurePoints })
    setOverriddenVertices(vertices)
  }
  const snapVertices = () => {
    let vertices = getCurrentVertices()
    vertices = snapVecs(vertices)
    setOverriddenVertices(vertices)
  }
  const rotateCw = (phi) => {
    let vertices = getCurrentVertices()
    const cosPhi = Math.cos(phi)
    const sinPhi = Math.sin(phi)

    vertices = vertices.map(([x, y]) => {
      let _x = (x - xMean) * cosPhi - (y - yMean) * sinPhi + xMean
      let _y = (x - xMean) * sinPhi + (y - yMean) * cosPhi + yMean
      return [_x, _y];
    })
    setOverriddenVertices(vertices)
  }
  const flipHz = () => {
    let vertices = getCurrentVertices()
    vertices = vertices.map(([x, y]) => {
      let _x = xMean - (x - xMean)
      return [_x, y]
    })
    setOverriddenVertices(vertices)
  }
  const flipVert = () => {
    let vertices = getCurrentVertices()
    vertices = vertices.map(([x, y]) => {
      let _y = yMean - (y - yMean)
      return [x, _y]
    })
    setOverriddenVertices(vertices)
  }
  const move = (dx, dy) => {
    let vertices = getCurrentVertices()
    vertices = vertices.map(([x, y]) => ([x + dx, y + dy]))
    setOverriddenVertices(vertices)
  }
  const powerClick = (idx) => {
    let vertices = _.cloneDeep(getCurrentVertices())
    let currPt = vertices[idx]

    figure.edges
        .filter(([v1, v2]) => v1 === idx || v2 === idx)
        .map(([v1, v2]) => (v1 === idx? v2: v1))
        .filter(v => !frozenFigurePoints.has(v))
        .map(v => {
            const originalDistance = optimalDistancesMap[idx][v];

            const oldPt = vertices[v]
            const norm = vecNorm(vecSub(oldPt, currPt))
            const scaled = vecMult(norm, originalDistance)
            let newPt = vecAdd(vecMult(norm, originalDistance), currPt)

            vertices[v] = newPt
        });

    setOverriddenVertices(vertices);
  }
  const reset = () => {
    setSimMode(null)
    stopPlaying()
    setOverriddenVertices(null)
    setZoom(0)
    setPanOffset([0, 0])
  }
  useHotkeys('shift+w', () => {
    move(0, -1)
  }, {}, [move])
  useHotkeys("shift+s", () => {
    move(0, 1)
  }, {}, [move])
  useHotkeys('shift+d', () => {
    move(1, 0)
  }, {}, [move])
  useHotkeys('shift+a', () => {
    move(-1, 0)
  }, {}, [move])
  useHotkeys('ctrl+shift+w', () => {
    move(0, -10)
  }, {}, [move])
  useHotkeys("ctrl+shift+s", () => {
    move(0, 10)
  }, {}, [move])
  useHotkeys('ctrl+shift+d', () => {
    move(10, 0)
  }, {}, [move])
  useHotkeys('ctrl+shift+a', () => {
    move(-10, 0)
  }, {}, [move])
  useHotkeys('e', () => {
    rotateCw(Math.PI/12)
  }, {}, [rotateCw])
  useHotkeys('q', () => {
    rotateCw(-Math.PI/12)
  }, {}, [rotateCw])
  useHotkeys('a', () => {
    flipHz()
  }, {}, [flipHz])
  useHotkeys('d', () => {
    flipVert()
  }, {}, [flipVert])
  useHotkeys('space', (ev) => {
    ev.preventDefault()
    togglePlaying()
  }, {}, [togglePlaying])
  useHotkeys('g', () => {
    toggleSimMode('gravity')
  }, {}, [toggleSimMode])
  useHotkeys('k', () => {
    singleShake()
  }, {}, [singleShake])
  useHotkeys('o', () => {
    toggleSimMode('simpleInflate')
  }, {}, [singleShake])
  useHotkeys('i', () => {
    toggleSimMode('inflate')
  }, {}, [toggleSimMode])
  useHotkeys('s', () => {
    snapVertices()
  }, {}, [snapVertices])
  useHotkeys('=', () => {
    setZoom(zoom+0.5)
  }, {}, [zoom])
  useHotkeys('-', () => {
    setZoom(zoom-0.5)
  }, {}, [zoom])
  useDOMEvent('keydown', (ev) => {
    // on press Shift
    if (ev.keyCode == 16) {
      setMultiselectMode(true)
    };
  })
  useDOMEvent('keyup', (ev) => {
    // on release Shift
    if (ev.keyCode == 16) {
      setMultiselectMode(false)
    }
  })
  useDOMEvent('keydown', (ev) => {
      // on press Shift
      if (ev.keyCode == 91) {
        setPowerClickMode(true)
      };
    })
    useDOMEvent('keyup', (ev) => {
      // on release Shift
      if (ev.keyCode == 91) {
        setPowerClickMode(false)
      }
    })

  useOnChangeValues([problem, solution], () => {
    reset()
  })
  return (
    <div className={styles.viewer}>
      <div className={styles.topLeft}>
        <TrafficLight
          size='14em'
          red={debncHasBrokenEdges}
          yellow={false}
          green={!debncHasBrokenEdges}
        />
      <Flex>
        {/* <TrafficLight
          size='4em'
          red={hasBrokenEdges}
          yellow={false}
          green={!hasBrokenEdges}
        /> */}
        <div>
          <input placeholder='username / manual solutions alias' value={username} onChange={ev => setUsername(ev.target.value)} />
          <button
            disabled={saved}
            style={_.merge({}, debncHasBrokenEdges && { opacity: 0.75 })}
            onClick={() => {
              stopPlaying()
              snapVertices()
              onSaveSolution(problemId, username, { vertices: getCurrentVertices() })
              toggleSaved()
            }
          }>
            {debncHasBrokenEdges
              ? (saved ? 'Okay...' : 'Save?')
              : (saved ? 'Saved' : 'Save')}
          </button>
        </div>
      </Flex>
    </div>
    <AspectRatioBox className={styles.svgWrapper}>
      <svg ref={svgRef} className={styles.svg} viewBox={`${0} ${0} ${xMax - xMin} ${yMax - yMin}`}>
        <Group x={-xMin} y={-yMin}>
          <Group x={(xMax-xMin)/2} y={(yMax-yMin)/2} scale={1/zoomScale}>
            <Group x={-(xMax-xMin)/2+panOffset[0]} y={-(yMax-yMin)/2+panOffset[1]}>
              <Group ref={zeroPointLocation} x={0} y={0} />
              <Hole safePadding={safePadding} vertices={hole} />
              <Bonuses vertices={bonuses}/>
              <Grid xMin={xMin} yMin={yMin} xMax={xMax} yMax={yMax} color='#787' />
              <Figure
                animate={true}
                vertices={getCurrentVertices()}
                edges={figure.edges}
                epsilon={epsilonFraction}
                edgeStretches={edgeStretches}
                overstretchedEdges={overstretchedEdges}
                overshrinkedEdges={overshrinkedEdges}
                frozenPoints={frozenFigurePoints}
                onPointGrab={(ev, idx) => {
                  ev.stopPropagation()
                  addFrozenFigurePoint(idx)
                }}
                onPointRelease={(ev, idx) => {
                  if (!multiselectMode) {
                    removeFrozenFigurePoint(idx)
                  }
                  if (powerClickMode) {
                    powerClick(idx);
                  }
                }}
                onPointDrag={(ev, idx) => {
                  const localDelta = clientDeltaToLocalSpaceDelta([ev.movementX, ev.movementY])
                  updateVerticePosition(idx, localDelta)
                }}
              />
            </Group>
          </Group>
        </Group>
      </svg>
    </AspectRatioBox>
    <AspectRatioBox className={styles.svgMarkupPlaceholder}/>
    <div className={styles.topRight}>
      <button onClick={togglePlaying}>{playing ? '(_) Physics: on' : '(_) Physics: off'}</button>
      <button onClick={() => toggleSimMode('inflate')}>{simMode == 'inflate' ? '(I) Inflating' : '(I) Inflate'}</button>
      <button onClick={() => toggleSimMode('simpleInflate')}>{simMode == 'simpleInflate' ? '(O) Stretching' : '(O) Stretch'}</button>
      <button onClick={() => toggleSimMode('gravity')}>{simMode == 'gravity' ? '(G) Gravitating' : '(G) Gravity'}</button>
      <button onClick={singleShake}>(K) Shake</button>
      <button onClick={snapVertices}>(S) Snap</button>
      <button onClick={reset}>Reset</button>
      <Spacer />
      <button style={{ height: '2.5em' }} onClick={() => setMultiselectMode(!multiselectMode)}>{multiselectMode ? 'Selecting...' : '⬆️ Glue Points'}</button>
      <button disabled={!frozenFigurePoints.size} onClick={() => unselectAllGluedPoints()}>Unselect {frozenFigurePoints.size}</button>
      <button onClick={toggleDragMode}>{dragMode ? 'Pan Enabled' : 'Pan Disabled'}</button>
    </div>
    <div className={styles.bottomRight}>
      <button onClick={() => setZoom(zoom+1)}>+</button>
      <button onClick={() => setZoom(zoom-1)}>-</button>
      <pre className={styles.score}>
        Zoom: {zoom > 0 && '+'}{zoom < 0 && '-'}{Math.abs(zoom)}
      </pre>
      <pre className={styles.score}>
        Epsilon: {_.round(epsilonFraction, 4)}
      </pre>
      <pre className={styles.score}>
        Score: {_.padStart(score, 4, ' ')}
      </pre>
      <pre className={styles.score}>
        Best: {_.padStart(stats.min_dislikes, 5, ' ')}
      </pre>
    </div>
    <pre className={styles.hotkeysInstruction}>
    {`
Extra hotkeys:

     E  - rotate +CW
     Q  - rotate -CW
     D  - flip vertical
     A  - mirror horiztl

shft+W  - move up          ctrl+shft+W  - power move up
shft+S  - move down        ctrl+shft+S  - power move down
shft+A  - move left        ctrl+shft+A  - power move left
shft+D  - move right       ctrl+shft+D  - power move right
    `.trim()}
    </pre>
    </div>
  )
}
