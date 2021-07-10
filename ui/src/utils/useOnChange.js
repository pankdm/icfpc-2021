import { useState, useEffect } from 'react'

export default function useOnChange(value, callback=() => {}) {
  const [prevValue, setPrevValue] = useState(value)
  useEffect(() => {
    callback(value, prevValue)
    setPrevValue(value)
  }, [value])
}

export function useOnChangeValues(values, callback=() => {}) {
  const [prevValues, setPrevValues] = useState(values)
  useEffect(() => {
    callback(values, prevValues)
    setPrevValues(values)
  }, values)
}
