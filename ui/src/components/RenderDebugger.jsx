import React, { useEffect } from "react"

export default function RenderDebugger({ name }) {
  useEffect(() => {
    console.log('RenderDebugger:', name, 'new instance rendered')
  }, [])
  return <></>
}
