import React from 'react'
import _ from 'lodash'
import { animated } from 'react-spring'

export default function Figure({
  figure,
  epsilon,
  snap=true,
  pointColor='#fff',
  pointRadius=0.5,
  lineColor='red',
  lineWidth=0.5,
  stretchColor='gold',
  shrinkColor='orange',
  ...props
}) {
  const { vertices, edges } = figure
  return (
    <g id='figure' {...props}>
      {edges.map(([start, end], idx) => {
        const [x1, y1] = vertices[start]
        const [x2, y2] = vertices[end]
        return (
          <animated.line
            key={idx}
            x1={x1}
            x2={x2}
            y1={y1}
            y2={y2}
            stroke={lineColor}
            strokeWidth={lineWidth}
            strokeLinecap='round'
            {...props}
          />
        )
      })}
      {vertices.map(([x, y], idx) => {
        return (
          <circle key={idx} cx={x} cy={y} r={0.5} fill={pointColor}/>
        )
      })}
    </g>
  )
}
