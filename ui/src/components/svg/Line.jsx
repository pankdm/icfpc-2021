import React from 'react'
import { useSpring, animated } from 'react-spring'

export default function Line({ x1, x2, y1, y2, stroke, animate=true, springConfig, ...props }) {
  const animatableProps = { x1, x2, y1, y2, stroke }
  const animatedProps = useSpring({ to: animatableProps, config: springConfig })
  return animated
    ? <animated.line {...animatedProps} {...props}/>
    : <line {...animatableProps} {...props}/>
}
