import { useState } from 'react'
import { sleep } from './utils.js'

export default function useBlip(delayMs=1000) {
  const [blipState, setBlipState] = useState(false)
  const [timeoutId, setTimeoutId] = useState(null)
  async function triggerBlip() {
    setBlipState(true)
    clearTimeout(timeoutId)
    setTimeoutId(setTimeout(() => {
      setBlipState(false)
      setTimeoutId(null)
    }, delayMs))
  }
  return [blipState, triggerBlip]
}
