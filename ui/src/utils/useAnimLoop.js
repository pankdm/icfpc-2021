import { useEffect, useRef, useState } from 'react'

export default function useAnimLoop(callback, { playImmediate=false }={}, deps=[]) {
  const [playing, setPlaying] = useState(playImmediate)
  const _playing = useRef(false)
  const _rafId = useRef(null)
  useEffect(() => {
    if (playing) {
      const loop = () => {
        if (!_playing.current) {
          return
        }
        callback()
        _rafId.current = requestAnimationFrame(loop)
      }
      loop()
    }
    return () => {
      cancelAnimationFrame(_rafId.current)
      _rafId.current = null
    }
  }, [playing, ...deps])
  const startPlaying = () => {
    _playing.current = true
    setPlaying(true)
  }
  const stopPlaying = () => {
    _playing.current = false
    setPlaying(false)
  }
  const togglePlaying = () => {
    if (playing) {
      stopPlaying()
    } else {
      startPlaying()
    }
  }
  return { playing, startPlaying, stopPlaying, togglePlaying }
}
