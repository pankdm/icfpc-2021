import React from 'react'
import _ from 'lodash'
import AspectRatioBox from './AspectRatioBox.jsx'
import Grid from './svg/Grid.jsx'
import Hole from './svg/Hole.jsx'
import Figure from './svg/Figure.jsx'
import RenderDebugger from './RenderDebugger.jsx'
import styles from './ProblemViewer.module.css'

export default function ProblemViewer({ problem, ...props }) {
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

  return (
    <AspectRatioBox>
      <svg className={styles.svg} viewBox={`${0} ${0} ${xMax - xMin} ${yMax - yMin}`}>
        <g transform={`translate(${-xMin},${-yMin})`}>
          <RenderDebugger name='ProblemViewer'/>
          <Hole safePadding={safePadding} vertices={hole} />
          <Grid xMin={xMin} yMin={yMin} xMax={xMax} yMax={yMax} color='#787' />
          <Figure figure={figure} epsilon={epsilon} />
        </g>
      </svg>
    </AspectRatioBox>
  )
}
