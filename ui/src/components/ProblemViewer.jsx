import React, { useCallback, useMemo, useRef, useState } from 'react'
import _ from 'lodash'
import AspectRatioBox from './AspectRatioBox.jsx'
import Grid from './svg/Grid.jsx'
import Hole from './svg/Hole.jsx'
import Figure from './svg/Figure.jsx'
import styles from './ProblemViewer.module.css'
import useBlip from '../utils/useBlip.js'
import { getDistanceMap, getScore } from '../utils/graph.js'
import { inflateLoop, inflateSimpleRadialLoop, relaxLoop, gravityLoop, applyShake } from '../utils/physics.js'
import { useOnChangeValues } from '../utils/useOnChange.js'
import useAnimLoop from '../utils/useAnimLoop.js'
import useToggle from '../utils/useToggle.js'
import { useHotkeys } from 'react-hotkeys-hook'

export default function ProblemViewer({ problem, solution, ...props }) {
  const [hint, toggleHint] = useBlip(300)
  const overriddenVertices = useRef(null)
  const [overriddenVerticesKey, setOverriddenVerticesKey] = useState(null)
  const [simMode, setSimMode] = useState(null)
  const { hole, epsilon, figure } = problem
  const minCoord = _.min([..._.flatten(hole), ..._.flatten(figure.vertices)])
  const maxCoord = _.max([..._.flatten(hole), ..._.flatten(figure.vertices)])
  const safePadding = 5
  const xMin = minCoord - safePadding
  const yMin = minCoord - safePadding
  const xMax = maxCoord + safePadding
  const yMax = maxCoord + safePadding
  const xMean = (maxCoord - minCoord) / 2
  const yMean = (maxCoord - minCoord) / 2
  const getCurrentVertices = () => overriddenVertices.current || (solution && solution.vertices) || figure.vertices
  const currentVertices = getCurrentVertices()
  const score = useMemo(() => {
    return Math.floor(getScore(hole, currentVertices))
  }, [currentVertices, hole])
  const setOverriddenVertices = (vertices) => {
    overriddenVertices.current = vertices
    setOverriddenVerticesKey(vertices ? Math.random() : null)
  }
  const optimalDistancesMap = useMemo(() => {
    console.log('distance map')
    return getDistanceMap(figure.vertices, figure.edges)
  }, [figure])
  const { playing, togglePlaying, stopPlaying } = useAnimLoop(() => {
    let vertices = getCurrentVertices()
    if (simMode == 'inflate') {
      vertices = inflateLoop(vertices, { optimalDistancesMap })
    }
    if (simMode == 'simpleInflate') {
      vertices = inflateSimpleRadialLoop(vertices, { optimalDistancesMap })
    }
    if (simMode == 'gravity') {
      vertices = gravityLoop(vertices, { gravityCenter: [xMean, yMean] })
    }
    vertices = relaxLoop(vertices, { optimalDistancesMap })
    setOverriddenVertices(vertices)
  }, {}, [simMode, optimalDistancesMap, xMean, yMean])
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
    console.log(vertices[0])
    vertices = applyShake(vertices, { maxAmplitude: 3 })
    console.log(vertices[0])
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
          <Figure hint={hint} edges={figure.edges} vertices={getCurrentVertices()} epsilon={epsilon} />
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
        <pre className={styles.score}>Score: {_.padStart(score, 4, ' ')}</pre>
      </div>
    </AspectRatioBox>
  )
}
