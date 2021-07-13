import React from 'react'
import { useSpring, animated } from 'react-spring'

export default function Label({ x=0, xOffset=0, y=0, yOffset=0, fontSize=2, color='#fff', animate=false, springConfig, ...props }) {
  const animatableProps = { x: x+xOffset, y: y+yOffset, fill:color }
  return <text {...animatableProps} fontSize={fontSize} {...props}/>

  const animatedProps = useSpring({ to: animatableProps, config: springConfig })
  return animate
    ? <animated.text {...animatedProps} fontSize={fontSize} {...props}/>
    : <text {...animatableProps} fontSize={fontSize} {...props}/>
}
