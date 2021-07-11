import React, { useRef } from 'react'
import _ from 'lodash'
import Point from './Point.jsx'

export default function Bonuses({
  vertices,
  radius=1.5,
  springConfig,
  ...props
}) {
  const colors = {
    'GLOBALIST': '#ff0',
    'BREAK_A_LEG': '#00f',
    'WALLHACK': '#fa0',
  }
  return (
    <g id='bonuses' {...props}>
      {vertices.map(({position, bonus}, idx) => {
        const color = colors[bonus] || '#000'
        const [x, y] = position
        return (
          <Point
            key={idx}
            idx={idx}
            x={x}
            y={y}
            radius={radius}
            color={color}
            springConfig={springConfig}
          />
        )
      })}
    </g>
  )
}