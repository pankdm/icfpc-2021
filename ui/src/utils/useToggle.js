import { useState } from 'react'

export default function useToggle(defaultValue=false) {
  const [value, setValue] = useState(defaultValue)
  const toggleValue = () => setValue(!value)
  return [value, toggleValue]
}
