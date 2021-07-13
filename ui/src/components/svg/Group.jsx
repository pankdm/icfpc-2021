import React from 'react'

const WrappedGroup = React.forwardRef(function Group({ x, y, scale=1, animate=false, springConfig, ...props }, ref) {
  return <g ref={ref} transform={`translate(${x}, ${y}) scale(${scale}, ${scale})`} {...props}/>
})

export default WrappedGroup
