import { useEffect } from 'react'

export default function useInterval(intervalMs=1000, callback, deps=[]) {
  useEffect(() => {
    const interval = setInterval(callback, intervalMs)
    return () => clearInterval(interval)
  }, [deps])
}
