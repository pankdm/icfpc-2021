import React from 'react'
import { useSpring, animated } from 'react-spring'

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
  const animatedProps = useSpring({ to: animatableProps, config: springConfig })
  return animate
    ? <animated.circle ref={ref} {...animatedProps} {...props}/>
    : <circle ref={ref} {...animatableProps} {...props}/>
})

export default WrappedPoint
