import { useEffect } from 'react'

export default function useInterval(callback, intervalMs=1000) {
  useEffect(() => {
    const interval = setInterval(callback, intervalMs)
    return () => clearInterval(interval)
  }, [callback])
}
