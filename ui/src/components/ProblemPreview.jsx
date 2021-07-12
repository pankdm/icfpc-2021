import React, { useMemo } from 'react'
import _ from 'lodash'
import AspectRatioBox from './AspectRatioBox.jsx'
import Bonuses from './svg/Bonuses.jsx'
import Group from './svg/Group.jsx'
import Grid from './svg/Grid.jsx'
import Hole from './svg/Hole.jsx'
import Figure from './svg/Figure.jsx'
import styles from './ProblemViewer.module.css'
import { getDistanceMap, getDistances, getScore, snapVecs, vecAdd, vecSub, vecMult, vecNorm, vecEquals, distance } from '../utils/graph.js'


export default function ProblemPreiew({ problem, ...props }) {
  const { hole, figure, bonuses, epsilon } = problem
  const epsilonFraction = epsilon/1e6
  const minCoord = _.min([..._.flatten(hole), ..._.flatten(figure.vertices)])
  const maxCoord = _.max([..._.flatten(hole), ..._.flatten(figure.vertices)])
  const zoomScale = 1
  const panOffset = [0, 0]
  const safePadding = 5
  const xMin = minCoord - safePadding
  const yMin = minCoord - safePadding
  const xMax = maxCoord + safePadding
  const yMax = maxCoord + safePadding
  const xMean = (maxCoord - minCoord) / 2
  const yMean = (maxCoord - minCoord) / 2
  const currentDistances = useMemo(() => {
    return getDistances(figure.vertices, figure.edges)
  }, [figure])
  const optimalDistancesMap = useMemo(() => {
    return getDistanceMap(figure.vertices, figure.edges)
  }, [figure])
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
  const { frozenPoints=[] } = figure
  const _frozenPoints = new Set(frozenPoints)
  return (
    <AspectRatioBox>
      <svg className={styles.svg} viewBox={`${0} ${0} ${xMax - xMin} ${yMax - yMin}`}>
        <Group x={-xMin} y={-yMin}>
          <Group x={(xMax-xMin)/2} y={(yMax-yMin)/2} scale={1/zoomScale}>
            <Group x={-(xMax-xMin)/2+panOffset[0]} y={-(yMax-yMin)/2+panOffset[1]}>
              <Hole
                renderLabels={false}
                safePadding={safePadding}
                vertices={hole}
              />
              <Bonuses vertices={bonuses}/>
              <Figure
                renderPoints={false}
                vertices={figure.vertices}
                edges={figure.edges}
                epsilon={epsilonFraction}
                edgeStretches={edgeStretches}
                overstretchedEdges={overstretchedEdges}
                overshrinkedEdges={overshrinkedEdges}
                frozenPoints={_frozenPoints}
              />
            </Group>
          </Group>
        </Group>
      </svg>
    </AspectRatioBox>
  )
}
