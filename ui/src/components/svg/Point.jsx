import React from 'react'

const WrappedPoint = React.forwardRef(function Point({
  x=0,
  y=0,
  radius=0.5,
  color='#fff',
  animate=false,
  springConfig,
  ...props
}, ref) {
  const animatableProps = { cx: x, cy: y, r: radius, fill: color }
  return <circle ref={ref} {...animatableProps} {...props}/>
})

export default WrappedPoint
