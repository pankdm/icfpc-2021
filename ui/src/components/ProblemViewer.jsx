import React, { useMemo, useRef, useState } from 'react'
import _ from 'lodash'
import AspectRatioBox from './AspectRatioBox.jsx'
import Grid from './svg/Grid.jsx'
import Hole from './svg/Hole.jsx'
import Figure from './svg/Figure.jsx'
import styles from './ProblemViewer.module.css'
import useBlip from '../utils/useBlip.js'
import { getDistanceMap } from '../utils/graph.js'
import { relaxVertices } from '../utils/physics.js'
import { useOnChangeValues } from '../utils/useOnChange.js'
import useAnimLoop from '../utils/useAnimLoop.js'

export default function ProblemViewer({ problem, solution, ...props }) {
  const [shake, toggleShake] = useBlip(300)
  const _overriddenVertices = useRef(null)
  const [overriddenVertices, setOverriddenVertices] = useState(null)
  const { playing, togglePlaying, stopPlaying } = useAnimLoop(() => {
    let _vertices = _overriddenVertices.current || figure.vertices
    _vertices = relaxVertices(_vertices, optimalDistancesMap, [xMean, yMean])
    _overriddenVertices.current = _vertices
    setOverriddenVertices(_vertices)
  })
  const reset = () => {
    stopPlaying()
    _overriddenVertices.current = null
    setOverriddenVertices(null)
  }
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
  const optimalDistancesMap = useMemo(() => getDistanceMap(figure.vertices, figure.edges), [figure])
  useOnChangeValues([problem, solution], () => {
    setOverriddenVertices(null)
  })
  const _vertices = overriddenVertices || (solution ? solution.vertices : figure.vertices)
  const _figure = {...figure, vertices: _vertices}

  return (
    <AspectRatioBox>
      <svg className={styles.svg} viewBox={`${0} ${0} ${xMax - xMin} ${yMax - yMin}`}>
        <g transform={`translate(${-xMin},${-yMin})`}>
          <Hole safePadding={safePadding} vertices={hole} />
          <Grid xMin={xMin} yMin={yMin} xMax={xMax} yMax={yMax} color='#787' />
          <Figure shake={shake} figure={_figure} epsilon={epsilon} />
        </g>
      </svg>
      <div className={styles.controlButtons}>
        <button onClick={toggleShake}>Shake</button>
        <button onClick={togglePlaying}>{playing ? 'Relaxing' : 'Relax'}</button>
        <button onClick={reset}>Reset</button>
      </div>
    </AspectRatioBox>
  )
}
