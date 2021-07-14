import { useRef, useEffect, useState } from 'react'
import _ from 'lodash'
import observable from 'proxy-observable'

export function defineGlobalVar(varObj={}) {
  return observable(varObj)
}

export function useGlobalVar(globalVar) {
  const [renderKey, setRenderKey] = useState(Math.random())
  useEffect(() => {
    const onChange = (value, prev, prop) => {
      requestAnimationFrame(() => {
        setRenderKey(Math.random())
      })
    }
    globalVar.on('any', onChange)
    return () => globalVar.off('any', onChange)
  }, [])
}

export default useGlobalVar
