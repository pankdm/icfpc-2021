import { useEffect, useRef, useState } from 'react'

export default function useAnimLoop(callback, playImmediate=false) {
  const [playing, setPlaying] = useState(false)
  const _playing = useRef(false)
  const startPlaying = () => {
    setPlaying(true)
    _playing.current = true
    requestAnimationFrame(() => {
      const loop = () => {
        if (!_playing.current) {
          return
        }
        callback()
        requestAnimationFrame(loop)
      }
      loop()
    })
  }
  const stopPlaying = () => {
    setPlaying(false)
    _playing.current = false
  }
  const togglePlaying = () => {
    if (_playing.current) {
      stopPlaying()
    } else {
      startPlaying()
    }
  }
  useEffect(() => {
    if (playImmediate) {
      startPlaying()
    }
  }, [])
  return { playing, startPlaying, stopPlaying, togglePlaying }
}
