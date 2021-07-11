import { useEffect, useState } from 'react'

export default function useDebounce(value, delayMs=300, callback=() => {}) {
  const [_value, setValue] = useState(value)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setValue(value)
      callback(value, _value)
    }, delayMs)
    return () => clearTimeout(timeoutId)
  }, [value, delayMs])
  return _value
}
