import { useEffect } from 'react'

export default function useDOMEvent(eventName, callback, deps=[]) {
  useEffect(() => {
    document.addEventListener(eventName, callback)
    return () => {
      document.removeEventListener(eventName, callback)
    }
  }, [...deps, eventName])
}
