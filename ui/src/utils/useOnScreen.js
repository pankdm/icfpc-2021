import { useState } from "react"
import useAnimationFrame from "./useAnimationFrame"
import useInterval from "./useInterval"

function checkIsVisible(elm, threshold) {
  threshold = threshold || 0;
  const rect = elm.getBoundingClientRect();
  const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
  const viewWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);
  const above = rect.bottom + threshold < 0;
  const below = rect.top - viewHeight - threshold >= 0;
  const left = rect.left + threshold < 0;
  const right = rect.top - viewWidth - threshold >= 0;
  return !(above || below || left || right)
}

export default function useOnScreen(ref, { checkinterval=null, margin=0 }) {
  // IMPORTANT: checkInterval not to be constant!!!
  const startVisible = ref.current ? checkIsVisible(ref.current) : false
  const [isVisible, setIsVisible] = useState(startVisible)
  const updateVisible = () => {
    if (ref.current) {
      const visible = checkIsVisible(ref.current, margin)
      if (isVisible !== visible) {
        setIsVisible(visible)
      }
    }
  }
  if (checkinterval) {
    useInterval(checkinterval, updateVisible, [isVisible])
  } else {
    useAnimationFrame(updateVisible, [isVisible])
  }
  return isVisible
}
