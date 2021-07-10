import React from 'react'
import _ from 'lodash'
import Line from './Line.jsx'
import Point from './Point.jsx'
import Group from './Group.jsx'
import Label from './Label.jsx'
import { shakePoint } from '../../utils/utils.js'

const springConfig={
  tension: 250,
  friction: 15,
}

export default function Figure({
  figure,
  shake=false,
  pointColor='#fff',
  pointRadius=0.5,
  lineColor='red',
  lineWidth=0.5,
  stretchedLines=null,
  shrinkedLines=null,
  stretchColor='gold',
  shrinkColor='orange',
  ...props
}) {
  const { vertices, edges } = figure
  const _vertices = shake ? _.map(vertices, p => shakePoint(p)) : vertices
  return (
    <g id='figure' {...props}>
      {edges.map(([start, end], idx) => {
        const [x1, y1] = _vertices[start]
        const [x2, y2] = _vertices[end]
        return (
          <Line
            key={idx}
            animate={true}
            x1={x1}
            x2={x2}
            y1={y1}
            y2={y2}
            springConfig={springConfig}
            stroke={lineColor}
            strokeWidth={lineWidth}
            strokeLinecap='round'
            {...props}
          />
        )
      })}
      {_vertices.map(([x, y], idx) => {
        return (
          <Group key={idx} x={x} y={y} animate={true}>
            <Point radius={0.5} color={pointColor} springConfig={springConfig} />
            <Label xOffset={0.5} yOffset={-0.5}>{idx}</Label>
          </Group>
        )
      })}
    </g>
  )
}
