import React from 'react'
import _ from 'lodash'

export default function Grid({
  xMin=0,
  xMax=100,
  xStep=1,
  yMin=0,
  yMax=100,
  yStep=1,
  color='#444',
  strokeWidth=0.05,
  ...props
}) {
  const xCount = Math.floor((xMax - xMin) / xStep) + 1
  const yCount = Math.floor((yMax - yMin) / yStep) + 1
  return (
    <g id='grid' {...props}>
      <path
        stroke={color}
        strokeWidth={strokeWidth}
        d={`
          ${_.times(yCount, (y) => `
            M ${xMin} ${yMin+y*yStep}
            H ${xMax}
          `).join('')}
          ${_.times(xCount, (x) => `
            M ${xMin+x*xStep} ${yMin}
            V ${yMax}
          `).join('')}
        `}
      />
    </g>
  )
}
