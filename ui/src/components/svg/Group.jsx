import React from 'react'
import { useSpring, animated } from 'react-spring'

export default function Group({ x, y, animate=false, springConfig, ...props }) {
  const animatableProps = { transform: `translate(${x}, ${y})` }
  const animatedProps = useSpring({ to: animatableProps, config: springConfig })
  return animate
    ? <animated.g {...animatedProps} {...props}/>
    : <g transform={`translate(${x}, ${y})`} {...props}/>
}
