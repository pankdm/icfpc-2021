import React, { useRef } from 'react'
import { useSpring, animated } from 'react-spring'
import useDrag from '../../utils/useDrag'

export default function Point({
  x=0,
  y=0,
  radius=0.5,
  color='#fff',
  onDragStart=() => {},
  onDragEnd=() => {},
  onDrag=() => {},
  animate=false,
  springConfig,
  ...props
}) {
  const ref = useRef()
  useDrag(ref, [], {
    onDragStart,
    onDragEnd,
    onDrag: (ev) => {
      onDrag({dx: ev.movementX, dy: ev.movementY, clientX: ev.clientX, clientY: ev.clientY})
    }
  })
  const animatableProps = { cx: x, cy: y, r: radius, fill: color }
  const animatedProps = useSpring({ to: animatableProps, config: springConfig })
  return animate
    ? <animated.circle ref={ref} {...animatedProps} {...props}/>
    : <circle ref={ref} {...animatableProps} {...props}/>
}
