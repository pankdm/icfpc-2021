import React from 'react'
import { useSpring, animated } from 'react-spring'

export default function Point({ x, y, radius=0.5, color='#fff', animate=true, springConfig, ...props }) {
  const animatableProps = { cx: x, cy: y, r: radius, fill: color }
  const animatedProps = useSpring({ to: animatableProps, config: springConfig })
  return animate
    ? <animated.circle {...animatedProps} {...props}/>
    : <circle {...animatableProps} {...props}/>
}
