import { useState, useEffect } from 'react'

const useDrag = (ref, deps=[], options) => {
  const {
    onPointerDown = () => {},
    onPointerMove = () => {},
    onDragStart = () => {},
    onDrag = () => {},
    onDragEnd = () => {},
  } = options

  const [isDragging, setIsDragging] = useState(false)

  const handlePointerDown = (e) => {
    setIsDragging(true)
    onPointerDown(e)
    onDragStart(e)
  }

  const handlePointerMove = (e) => {
    onPointerMove(e)
    if (isDragging) {
      onDrag(e)
    }
  }

  const handleRelease = (e) => {
    if (isDragging) {
      onDragEnd(e)
    }
    setIsDragging(false)
  }

  useEffect(() => {
    const element = ref.current
    if (element) {
      element.addEventListener('mousedown', handlePointerDown)
      element.removeEventListener('mouseup', handleRelease)
      window.addEventListener('mousemove', handlePointerMove)
      window.addEventListener('mouseup', handleRelease)

      return () => {
        element.removeEventListener('mousedown', handlePointerDown)
        element.removeEventListener('mouseup', handleRelease)
        window.removeEventListener('mousemove', handlePointerMove)
        window.removeEventListener('mouseup', handleRelease)
      }
    }

    return () => {}
  }, [...deps, ref, isDragging, handlePointerMove, handleRelease])

  return { isDragging }
}

export default useDrag
