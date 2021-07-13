import React from 'react'

export default function Line({ x1, x2, y1, y2, stroke, animate=false, springConfig, ...props }) {
  const animatableProps = { x1, x2, y1, y2, stroke }
  return <line {...animatableProps} {...props}/>
}
