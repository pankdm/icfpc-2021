import React from 'react'
import { useSpring, animated } from 'react-spring'

const WrappedGroup = React.forwardRef(function Group({ x, y, scale=1, animate=false, springConfig, ...props }, ref) {
  const animatableProps = { transform: `translate(${x}, ${y}) scale(${scale}, ${scale})` }
  const animatedProps = useSpring({ to: animatableProps, config: springConfig })
  return animate
    ? <animated.g ref={ref} {...animatedProps} {...props}/>
    : <g ref={ref} transform={`translate(${x}, ${y}) scale(${scale}, ${scale})`} {...props}/>
})

export default WrappedGroup
