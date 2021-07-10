import React from 'react'
import _ from 'lodash'
import AspectRatioBox from './AspectRatioBox.jsx'
import Grid from './svg/Grid.jsx'
import Hole from './svg/Hole.jsx'
import Figure from './svg/Figure.jsx'
import RenderDebugger from './RenderDebugger.jsx'
import styles from './ProblemViewer.module.css'
import useBlip from '../utils/useBlip.js'

export default function ProblemViewer({ problem, solution, ...props }) {
  const [shake, toggleShake] = useBlip(300)
  if (!problem) {
    return (
      <AspectRatioBox>
        <svg className={styles.svg} viewBox={`0 0 10 10`} />
      </AspectRatioBox>
    )
  }
  const { hole, epsilon, figure } = problem
  const safePadding = 5
  const minCoord = _.min(_.flatten(hole))
  const maxCoord = _.max(_.flatten(hole))
  const xMin = minCoord - safePadding
  const yMin = minCoord - safePadding
  const xMax = maxCoord + safePadding
  const yMax = maxCoord + safePadding
  const _figure = solution ? {...figure, ...solution} : figure

  return (
    <AspectRatioBox>
      <svg className={styles.svg} viewBox={`${0} ${0} ${xMax - xMin} ${yMax - yMin}`}>
        <g transform={`translate(${-xMin},${-yMin})`}>
          <RenderDebugger name='ProblemViewer'/>
          <Hole safePadding={safePadding} vertices={hole} />
          <Grid xMin={xMin} yMin={yMin} xMax={xMax} yMax={yMax} color='#787' />
          <Figure shake={shake} figure={_figure} epsilon={epsilon} />
        </g>
      </svg>
      <button className={styles.shakeButton} onClick={toggleShake}>Shake</button>
    </AspectRatioBox>
  )
}
