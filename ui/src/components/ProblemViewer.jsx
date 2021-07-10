import React, { useCallback, useMemo, useRef, useState } from 'react'
import _ from 'lodash'
import AspectRatioBox from './AspectRatioBox.jsx'
import Group from './svg/Group.jsx'
import Grid from './svg/Grid.jsx'
import Hole from './svg/Hole.jsx'
import Figure from './svg/Figure.jsx'
import styles from './ProblemViewer.module.css'
import { getDistanceMap, getDistances, getScore, vecAdd, vecSub } from '../utils/graph.js'
import { inflateLoop, inflateSimpleRadialLoop, relaxLoop, gravityLoop, applyShake } from '../utils/physics.js'
import { useOnChangeValues } from '../utils/useOnChange.js'
import useAnimLoop from '../utils/useAnimLoop.js'
import { useHotkeys } from 'react-hotkeys-hook'
import useDrag from '../utils/useDrag.js'
import useBlip from '../utils/useBlip.js'

export default function ProblemViewer({ problemId, problem, solution, onSaveSolution, ...props }) {
  const { hole, epsilon, figure } = problem
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
  const overriddenVertices = useRef(null)
  const [zoom, setZoom] = useState(0)
  const [saved, toggleSaved] = useBlip(300)
  const zoomScale = 2**-zoom
  const [panDragStartPoint, setPanDragStartPoint] = useState(null)
  const [panDragStartOffset, setPanDragStartOffset] = useState(null)
  const [panOffset, setPanOffset] = useState([0, 0])
  const [overriddenVerticesKey, setOverriddenVerticesKey] = useState(null)
  const [simMode, setSimMode] = useState(null)
  const [frozenFigurePoints, setFrozenFigurePoints] = useState([])
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
  useDrag(svgRef, [zoomScale, panDragStartPoint, panDragStartOffset, panOffset], {
    onDragStart: (ev) => {
      const x = ev.clientX
      const y = ev.clientY
      const localPoint = clientPointToLocalSpacePoint([x, y], true)
      setPanDragStartPoint(localPoint)
      setPanDragStartOffset(panOffset)
    },
    onDrag: (ev) => {
      const x = ev.clientX
      const y = ev.clientY
      if (panDragStartPoint && panDragStartOffset) {
        const localPoint = clientPointToLocalSpacePoint([x, y], true)
        const panDragOffset = vecSub(localPoint, panDragStartPoint)
        const newPanOffset = vecAdd(panDragOffset, panDragStartOffset)
        setPanOffset(newPanOffset)
      }
    },
    onDragEnd: (ev) => {
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
      _.pickBy(stretches, (v) => v > 1+epsilonFraction),
      _.pickBy(stretches, (v) => v < 1-epsilonFraction),
    ]
  }, [figure, optimalDistancesMap, currentDistances, epsilon])
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
      vertices = inflateLoop(vertices, { optimalDistancesMap })
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
  const singleShake = () => {
    let vertices = currentVertices
    vertices = applyShake(vertices, { maxAmplitude: 3, frozenPoints: frozenFigurePoints })
    setOverriddenVertices(vertices)
  }
  const reset = () => {
    setSimMode(null)
    stopPlaying()
    setOverriddenVertices(null)
    setZoom(0)
    setPanOffset([0, 0])
  }
  useHotkeys('r', () => {
    reset()
  }, {}, [reset])
  useHotkeys('p', () => {
    togglePlaying()
  }, {}, [togglePlaying])
  useHotkeys('g', () => {
    toggleSimMode('gravity')
  }, {}, [toggleSimMode])
  useHotkeys('k', () => {
    singleShake()
  }, {}, [singleShake])
  useHotkeys('i', () => {
    toggleSimMode('simpleInflate')
  }, {}, [singleShake])
  useHotkeys('o', () => {
    toggleSimMode('infalte')
  }, {}, [toggleSimMode])
  useOnChangeValues([problem, solution], () => {
    reset()
  })
  return (
    <AspectRatioBox>
      <svg ref={svgRef} className={styles.svg} viewBox={`${0} ${0} ${xMax - xMin} ${yMax - yMin}`}>
        <Group x={-xMin} y={-yMin}>
          <Group x={(xMax-xMin)/2} y={(yMax-yMin)/2} scale={1/zoomScale}>
            <Group x={-(xMax-xMin)/2+panOffset[0]} y={-(yMax-yMin)/2+panOffset[1]}>
              <Group ref={zeroPointLocation} x={0} y={0} />
              <Hole safePadding={safePadding} vertices={hole} />
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
                  setFrozenFigurePoints([idx])
                }}
                onPointRelease={() => setFrozenFigurePoints([])}
                onPointDrag={(ev, idx) => {
                  const localDelta = clientDeltaToLocalSpaceDelta([ev.movementX, ev.movementY])
                  updateVerticePosition(idx, localDelta)
                }}
              />
            </Group>
          </Group>
        </Group>
      </svg>
      <div className={styles.topLeft}>
        <button
          disabled={saved}
          onClick={() => {
            onSaveSolution(problemId, { vertices: getCurrentVertices() })
            toggleSaved()
          }
        }>
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
      <div className={styles.topRight}>
        <button onClick={togglePlaying}>{playing ? 'Physics: on' : 'Physics: off'}</button>
        <button onClick={() => toggleSimMode('inflate')}>{simMode == 'inflate' ? 'Inflating' : 'Inflate'}</button>
        <button onClick={() => toggleSimMode('simpleInflate')}>{simMode == 'simpleInflate' ? 'Stretching' : 'Stretch'}</button>
        <button onClick={() => toggleSimMode('gravity')}>{simMode == 'gravity' ? 'Gravitating' : 'Gravity'}</button>
        <button onClick={singleShake}>Shake</button>
        <button onClick={reset}>Reset</button>
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
      </div>
    </AspectRatioBox>
  )
}
