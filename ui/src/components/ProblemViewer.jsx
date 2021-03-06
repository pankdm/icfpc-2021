import React, { useMemo, useRef, useState } from 'react'
import _ from 'lodash'
import AspectRatioBox from './AspectRatioBox.jsx'
import Spacer from './Spacer.jsx'
import Flex, { FlexItem } from './Flex.jsx'
import TrafficLight from './TrafficLight.jsx'
import Bonuses from './svg/Bonuses.jsx'
import Group from './svg/Group.jsx'
import Grid from './svg/Grid.jsx'
import Hole from './svg/Hole.jsx'
import Figure from './svg/Figure.jsx'
import styles from './ProblemViewer.module.css'
import { getDistanceMap, getDistances, getScore, snapVecs, vecAdd, vecSub, vecMult, vecNorm, distance, checkEdgesIntersect } from '../utils/graph.js'
import { FORCE_CONSTS, stretchLoop, inflateLoop, relaxLoop, gravityLoop, applyShake, winningGraityLoop } from '../utils/physics.js'
import useOnChange, { useOnChangeValues } from '../utils/useOnChange.js'
import useAnimLoop from '../utils/useAnimLoop.js'
import { useHotkeys } from 'react-hotkeys-hook'
import useDrag from '../utils/useDrag.js'
import useBlip from '../utils/useBlip.js'
import useDebounce from '../utils/useDebounce.js'
import useLocalStorage from '../utils/useLocalStorage.js'
import useDOMEvent from '../utils/useDOMEvent.js'
import { unpad } from '../utils/utils.js'

const DEFAULT_FORCE_CONSTS = {...FORCE_CONSTS}

export default function ProblemViewer({ problemId, problem, solution, onSaveSolution, stats, ...props }) {
  const defaultForceConstsInput = JSON.stringify(DEFAULT_FORCE_CONSTS, undefined, 2)
  const [ forceConstsInput, setForceConstsInput ] = useState(defaultForceConstsInput)
  const { hole, holeEdgeVerticePairs, epsilon, figure, bonuses } = problem
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
  const [pointRadius, setPointRadius] = useState(0.5)
  const [timeScale, setTimeScale] = useState(1)
  const [multiselectMode, setMultiselectMode] = useState(false)
  const [powerClickMode, setPowerClickMode] = useState(false)
  const [panOffset, setPanOffset] = useState([0, 0])
  const [overriddenVerticesKey, setOverriddenVerticesKey] = useState(null)
  const [simMode, setSimMode] = useState(null)
  const getInitFrozenPoints = () => solution && solution.fixedPoints || []
  const [frozenFigurePoints, _setFrozenFigurePoints] = useState(new Set(getInitFrozenPoints()))
  const setFrozenFigurePoints = (points) => _setFrozenFigurePoints(new Set([...points]))
  useOnChange(solution, () => {
    setFrozenFigurePoints(getInitFrozenPoints())
  })
  const addFrozenFigurePoint = (idx) => {
    const newSet = new Set(frozenFigurePoints)
    newSet.add(idx)
    _setFrozenFigurePoints(newSet)
  }
  const addFrozenFigurePoints = (idxs) => {
    const newSet = new Set(frozenFigurePoints)
    for (const idx of idxs) {
      newSet.add(idx)
    }
    _setFrozenFigurePoints(newSet)
  }
  const removeFrozenFigurePoint = (idx) => {
    const newSet = new Set(frozenFigurePoints)
    newSet.delete(idx)
    _setFrozenFigurePoints(newSet)
  }
  const removeFrozenFigurePoints = (idxs) => {
    const newSet = new Set(frozenFigurePoints)
    for (const idx of idxs) {
      newSet.delete(idx)
    }
    _setFrozenFigurePoints(newSet)
  }
  const clearFrozenFigurePoints = () => _setFrozenFigurePoints(new Set())
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
  const getCurrentEdgeVerticePairs = () => _.map(figure.edges, ([v1, v2]) => [currentVertices[v1], currentVertices[v2]])
  const currentEdgeVerticePairs = getCurrentEdgeVerticePairs()
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
  const hasIntersectingEdges = _.some(currentEdgeVerticePairs, figureEdgePoints => {
    return _.some(holeEdgeVerticePairs, holeEdgePoints => checkEdgesIntersect(figureEdgePoints, holeEdgePoints))
  })
  const badForSubmission = hasBrokenEdges || hasIntersectingEdges
  const debncBadForSubmission = useDebounce(badForSubmission, badForSubmission ? 0 : 500)
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
    _.times(1 + (timeScale-1)*3, () => {
      if (simMode == 'inflate') {
        vertices = inflateLoop(vertices, { optimalDistancesMap, frozenPoints })
      }
      if (simMode == 'stretch') {
        vertices = stretchLoop(vertices, { optimalDistancesMap, frozenPoints })
      }
      if (simMode == 'gravity') {
        vertices = gravityLoop(vertices, { frozenPoints })
      }
      if (simMode == 'winningGravity') {
        vertices = winningGraityLoop(vertices, { holeVertcies: hole, frozenPoints })
      }
      vertices = relaxLoop(vertices, { optimalDistancesMap, frozenPoints })
    })
    setOverriddenVertices(vertices)
  }, {}, [frozenFigurePoints, simMode, optimalDistancesMap, xMean, yMean, timeScale])
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
  const snapVertices = (verticesToSnap=null) => {
    let vertices = getCurrentVertices()
    if (verticesToSnap) {
      let _verticesToSnap = _.map(verticesToSnap, (idx) => vertices[idx])
      _verticesToSnap = snapVecs(_verticesToSnap)
      _verticesToSnap = _.zipObject(verticesToSnap, _verticesToSnap)
      vertices = _.map(vertices, (v, idx) => _verticesToSnap[idx] || v)
    } else {
      vertices = snapVecs(vertices)
    }
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
  const randomize = () => {
    let vertices = getCurrentVertices()
    vertices = vertices.map(([x, y]) => {
      return [xMin + Math.random() * (xMax - xMin), yMin + Math.random() * (yMax - yMin)]
    })
    setOverriddenVertices(vertices)
  }
  const move = (dx, dy) => {
    let vertices = getCurrentVertices()
    vertices = vertices.map(([x, y]) => ([x + dx, y + dy]))
    setOverriddenVertices(vertices)
  }
  const getNeighbors = (idx) => {
    return figure.edges
        .filter(([v1, v2]) => v1 === idx || v2 === idx)
        .map(([v1, v2]) => (v1 === idx ? v2 : v1));
  }
  const powerClick = (idx) => {
    let vertices = _.cloneDeep(getCurrentVertices())
    let currPt = vertices[idx]

    getNeighbors(idx)
        .filter(v => !frozenFigurePoints.has(v))
        .map(v => {
            const originalDistance = optimalDistancesMap[idx][v];

            const oldPt = vertices[v]
            const norm = vecNorm(vecSub(oldPt, currPt))
            let newPt = vecAdd(vecMult(norm, originalDistance), currPt)

            vertices[v] = newPt
        });

    setOverriddenVertices(vertices);
  }
  const snapWinningVertices = (snapRadius=1) => {
    let vertices = getCurrentVertices()
    const verticesToSnap = vertices.reduce((acc, v, idx) => {
      const hidx = _.findIndex(hole, (h) => distance(v, h) < snapRadius)
      if (hidx >= 0) {
        acc.push([idx, hidx])
      }
      return acc
    }, [])
    const verticesSnapIds = _.map(verticesToSnap, 0)
    addFrozenFigurePoints(verticesSnapIds)
    const verticesSnapMap = _.fromPairs(_.map(verticesToSnap, ([vid, hid]) => [vid, hole[hid]]))
    vertices = vertices.map((v, idx) => verticesSnapMap[idx] || vertices[idx])
    setOverriddenVertices(vertices)
  }
  const reset = () => {
    setSimMode(null)
    stopPlaying()
    setOverriddenVertices(null)
    setFrozenFigurePoints(getInitFrozenPoints())
    setZoom(0)
    setTimeScale(1)
    setPanOffset([0, 0])
  }
  useHotkeys('up', (ev) => {
    ev.preventDefault()
    move(0, -1)
  }, {}, [move])
  useHotkeys("down", (ev) => {
    ev.preventDefault()
    move(0, 1)
  }, {}, [move])
  useHotkeys('right', (ev) => {
    ev.preventDefault()
    move(1, 0)
  }, {}, [move])
  useHotkeys('left', (ev) => {
    ev.preventDefault()
    move(-1, 0)
  }, {}, [move])
  useHotkeys('shift+up', (ev) => {
    ev.preventDefault()
    move(0, -10)
  }, {}, [move])
  useHotkeys("shift+down", (ev) => {
    ev.preventDefault()
    move(0, 10)
  }, {}, [move])
  useHotkeys('shift+right', (ev) => {
    ev.preventDefault()
    move(10, 0)
  }, {}, [move])
  useHotkeys('shift+left', (ev) => {
    ev.preventDefault()
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
    toggleSimMode('stretch')
  }, {}, [singleShake])
  useHotkeys('i', () => {
    toggleSimMode('inflate')
  }, {}, [toggleSimMode])
  useHotkeys('u', () => {
    toggleSimMode('winningGravity')
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
  useHotkeys('0,1,2,3,4,5,6,7,8,9', (ev) => {
    const number = ev.keyCode - 48
    if (number == 0) {
      setTimeScale(10)
    } else {
      setTimeScale(number)
    }
  }, {}, [])
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
    <div>
      <div className={styles.viewer}>
        <div className={styles.topLeft}>
          <TrafficLight
            size='14em'
            red={debncBadForSubmission}
            yellow={false}
            green={!debncBadForSubmission}
          />
        <Flex>
          <div>
            <input
              className={styles.usernameInput}
              placeholder='username / manual solutions alias'
              value={username}
              onChange={ev => setUsername(ev.target.value)}
            />
            <button
              disabled={saved}
              style={_.merge({}, debncBadForSubmission && { opacity: 0.75 })}
              onClick={() => {
                stopPlaying()
                snapVertices()
                onSaveSolution(problemId, username, { vertices: getCurrentVertices(), fixedPoints: [...frozenFigurePoints] })
                toggleSaved()
              }
            }>
              {debncBadForSubmission
                ? (saved ? 'Okay...' : 'Save?')
                : (saved ? 'Saved' : 'Save')}
            </button>
            <button
              disabled={saved}
              style={_.merge({}, debncBadForSubmission && { opacity: 0.75 })}
              onClick={() => {
                stopPlaying()
                snapVertices()
                onSaveSolution(problemId, username, { vertices: getCurrentVertices() },  /* forSubmit */ true)
                toggleSaved()
              }
            }>
              {debncBadForSubmission
                ? (saved ? 'Okay...' : 'Save for Submit?')
                : (saved ? 'Saved' : 'Save for Submit')}
            </button>
          <pre style={{overflowX: 'scroll'}}>
          {unpad(`
          Stretched Edges:
          ${_.keys(overstretchedEdges).length
            ? _.keys(overstretchedEdges).map((k) => `(${figure.edges[k].join(',')})`).join(', ')
            : 'None'
          }

          Shrinked Edges:
          ${_.keys(overshrinkedEdges).length
            ? _.keys(overshrinkedEdges).map((k) => `(${figure.edges[k].join(',')})`).join(', ')
            : 'None'
          }
          `)}
          </pre>
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
                  animate={false}
                  vertices={getCurrentVertices()}
                  pointRadius={pointRadius}
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
                    let wasFrozen = frozenFigurePoints.has(idx);
                    if (!multiselectMode) {
                      removeFrozenFigurePoint(idx)
                    }
                    if (powerClickMode) {
                      powerClick(idx);
                      addFrozenFigurePoint(idx);
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
      <div className={styles.topRight}>
        <button onClick={togglePlaying}>{playing ? '(_) Physics: on' : '(_) Physics: off'}</button>
        <button onClick={() => toggleSimMode('inflate')}>{simMode == 'inflate' ? '(I) Inflating' : '(I) Inflate'}</button>
        <button onClick={() => toggleSimMode('stretch')}>{simMode == 'stretch' ? '(O) Stretching' : '(O) Stretch'}</button>
        <button onClick={() => toggleSimMode('gravity')}>{simMode == 'gravity' ? '(G) Gravitating' : '(G) Gravity'}</button>
        <button onClick={() => toggleSimMode('winningGravity')}>{simMode == 'winningGravity' ? '(U) Holing...' : '(U) Hole It'}</button>
        <button onClick={singleShake}>(K) Shake</button>
        <button onClick={() => snapVertices()}>(S) Snap</button>
        <button onClick={randomize}>Randomize</button>
        <button onClick={reset}>Reset</button>
        <Spacer />
        <button style={{ height: '2.5em' }} onClick={() => setMultiselectMode(!multiselectMode)}>{multiselectMode ? 'Selecting...' : '?????? Glue Points'}</button>
        <button style={{ height: '2.5em' }} onClick={() => snapWinningVertices()}>Snap Winners</button>
        <button disabled={!frozenFigurePoints.size} onClick={() => unselectAllGluedPoints()}>Unselect {frozenFigurePoints.size}</button>
        <button onClick={toggleDragMode}>{dragMode ? 'Pan Enabled' : 'Pan Disabled'}</button>
        <button onClick={() => setZoom(zoom+1)}>+</button>
        <button onClick={() => setZoom(zoom-1)}>-</button>
        <Flex alignItems='center'>
          <FlexItem basis='1.5em' grow={0} shrink={0}>
            <button style={{minWidth: 0, margin: 0}} onClick={() => setTimeScale(Math.max(timeScale-1, 1))}>-</button>
          </FlexItem>
          <Flex grow={1} justifyContent='center' alignSelf='stretch'>
            Speed: {timeScale}
          </Flex>
          <FlexItem basis='1.5em' grow={0} shrink={0}>
            <button style={{minWidth: 0, margin: 0}} onClick={() => setTimeScale(timeScale+1)}>+</button>
          </FlexItem>
        </Flex>
        <Flex alignItems='center'>
          <FlexItem basis='1.5em' grow={0} shrink={0}>
            <button style={{minWidth: 0, margin: 0}} onClick={() => setPointRadius(Math.max(pointRadius-0.5, 0.5))}>-</button>
          </FlexItem>
          <Flex grow={1} justifyContent='center' alignSelf='stretch'>
            Size: {pointRadius}
          </Flex>
          <FlexItem basis='1.5em' grow={0} shrink={0}>
            <button style={{minWidth: 0, margin: 0}} onClick={() => setPointRadius(pointRadius+0.5)}>+</button>
          </FlexItem>
        </Flex>
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
      <div className={styles.bottomRight}>
      </div>
    </div>
    <Flex alignItems='flex-start' style={{ padding: '1em 0 2em' }}>
      <pre className={styles.hotkeysInstruction}>
        {unpad(`
          Extra hotkeys:

                    E  - rotate +CW
                    Q  - rotate -CW
                    D  - flip vertical
                    A  - mirror horiztl

                  up  - move up
                down  - move down
                right  - move left
                left  - move right

            shift+up  - power move up
          shift+down  - power move down
          shift+right  - power move left
          shift+left  - power move right
        `)}
      </pre>
    <FlexItem style={{ marginLeft: '1em' }}>
      <pre style={{ padding: '1em 0 0' }}>
        Physics consts:
        {`    `}
        {forceConstsInput != defaultForceConstsInput &&
          <span style={{ cursor: 'pointer' }} onClick={() => {
            setForceConstsInput(JSON.stringify(DEFAULT_FORCE_CONSTS, undefined, 2))
            Object.assign(FORCE_CONSTS, DEFAULT_FORCE_CONSTS)
          }}>reset</span>
        }
      </pre>
      <textarea
        className={styles.configEditor}
        style={{ height: '20em' }}
        value={forceConstsInput}
        onInput={(ev) => {
          const value = ev.target.value
          setForceConstsInput(value)
          try {
            const updatedJson = JSON.parse(value)
            Object.assign(FORCE_CONSTS, updatedJson)
          } catch (err) {
            Object.assign(FORCE_CONSTS, DEFAULT_FORCE_CONSTS)
          }
        }}
      />
    </FlexItem>
    </Flex>
    </div>
  )
}
