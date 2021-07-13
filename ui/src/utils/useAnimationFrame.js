import { useLayoutEffect } from 'react'

export default function useAnimationFrame(callback, deps=[]) {
  useLayoutEffect(() => {
    let loopId
    const loop = () => {
      callback()
      loopId = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(loopId)
  }, [deps])
}
