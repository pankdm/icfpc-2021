import React from 'react'
import _ from 'lodash'
import Label from './Label.jsx'

export default function Hole({
  vertices,
  bgColor='#444',
  color='#aaa',
  safePadding=5,
  renderLabels=true,
  ...props
}) {
  const minCoord = _.min(_.flatten(vertices))
  const maxCoord = _.max(_.flatten(vertices))
  const xMin = minCoord - safePadding
  const yMin = minCoord - safePadding
  const xMax = maxCoord + safePadding
  const yMax = maxCoord + safePadding
  const [head, ...rest] = vertices
  return (
    <g id='hole' {...props}>
      <path
        fill={bgColor}
        fillRule='nonzero'
        d={`
          M ${xMin} ${yMin}
          L ${xMin} ${yMax}
          L ${xMax} ${yMax}
          L ${xMax} ${yMin}
          Z
          M ${head[0]} ${head[1]}
          ${rest.map(([x, y]) => `L ${x} ${y} `).join('\n')}
          Z
        `}
        {...props}
      />
      <path
        fill={color}
        fillRule='nonzero'
        d={`
          M ${head[0]} ${head[1]}
          ${rest.map(([x, y]) => `L ${x} ${y} `).join('\n')}
          Z
        `}
        {...props}
      />
      {renderLabels && vertices.map(([x, y], idx) => (
        <Label key={idx} x={x} y={y} textAnchor='right' color='#000'>{idx}</Label>
      ))}
    </g>
  )
}
