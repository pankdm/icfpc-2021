import React, { useCallback, useMemo, useRef, useState } from 'react'
import _ from 'lodash'
import AspectRatioBox from './AspectRatioBox.jsx'
import Grid from './svg/Grid.jsx'
import Hole from './svg/Hole.jsx'
import Figure from './svg/Figure.jsx'
import styles from './ProblemViewer.module.css'
import useBlip from '../utils/useBlip.js'
import { distance, getDistanceMap, getDistances, getScore } from '../utils/graph.js'
import { inflateLoop, inflateSimpleRadialLoop, relaxLoop, gravityLoop, applyShake } from '../utils/physics.js'
import { useOnChangeValues } from '../utils/useOnChange.js'
import useAnimLoop from '../utils/useAnimLoop.js'
import useToggle from '../utils/useToggle.js'
import { useHotkeys } from 'react-hotkeys-hook'

export default function ProblemViewer({ problem, solution, ...props }) {
  const { hole, epsilon, figure } = problem
  const epsilonFraction = epsilon/1e6
  const [hint, toggleHint] = useBlip(300)
  const overriddenVertices = useRef(null)
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
  useHotkeys('p', () => {
    togglePlaying()
  }, {}, [togglePlaying])
  const singleShake = () => {
    let vertices = currentVertices
    vertices = applyShake(vertices, { maxAmplitude: 3 })
    setOverriddenVertices(vertices)
  }
  const reset = () => {
    setSimMode(null)
    stopPlaying()
    setOverriddenVertices(null)
  }
  useOnChangeValues([problem, solution], () => {
    reset()
  })

  return (
    <AspectRatioBox>
      <svg className={styles.svg} viewBox={`${0} ${0} ${xMax - xMin} ${yMax - yMin}`}>
        <g transform={`translate(${-xMin},${-yMin})`}>
          <Hole safePadding={safePadding} vertices={hole} />
          <Grid xMin={xMin} yMin={yMin} xMax={xMax} yMax={yMax} color='#787' />
          <Figure
            vertices={getCurrentVertices()}
            edges={figure.edges}
            epsilon={epsilonFraction}
            edgeStretches={edgeStretches}
            overstretchedEdges={overstretchedEdges}
            overshrinkedEdges={overshrinkedEdges}
            onPointGrab={(idx) => setFrozenFigurePoints([idx])}
            onPointRelease={() => setFrozenFigurePoints([])}
          />
        </g>
      </svg>
      <div className={styles.topRight}>
        <button onClick={togglePlaying}>{playing ? 'Physics: on' : 'Physics: off'}</button>
        <button onClick={() => toggleSimMode('inflate')}>{simMode == 'inflate' ? 'Inflating' : 'Inflate'}</button>
        <button onClick={() => toggleSimMode('simpleInflate')}>{simMode == 'simpleInflate' ? 'Stretching' : 'Sretch'}</button>
        <button onClick={() => toggleSimMode('gravity')}>{simMode == 'gravity' ? 'Gravitating' : 'Gravity'}</button>
        <button onClick={singleShake}>Shake</button>
        <button onClick={reset}>Reset</button>
      </div>
      <div className={styles.bottomRight}>
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
