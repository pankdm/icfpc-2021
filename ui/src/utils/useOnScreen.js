import { useState, useLayoutEffect } from "react"
import useInterval from "./useInterval";

function syncCheckVisible(elm, threshold) {
  threshold = threshold || 0;
  var rect = elm.getBoundingClientRect();
  var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
  var above = rect.bottom - threshold < 0;
  var below = rect.top - viewHeight + threshold >= 0;
  return !(above || below)
}

export default function useOnScreen(ref, margin=0) {
  const startVisible = ref.current ? syncCheckVisible(ref.current) : false
  // const startVisible = false
  const [isIntersecting, setIntersecting] = useState(startVisible)
  useInterval(100, () => {
    const visible = ref.current && syncCheckVisible(ref.current, margin)
    if (isIntersecting != visible) {
      setIntersecting(visible)
    }
  }, [isIntersecting])

  // FIXME: use IntersectionObserver?
  // useLayoutEffect(() => {
  //   const observer = new IntersectionObserver(
  //     ([entry]) => {
  //       debugId && console.log('Observer: ', debugId, entry.isIntersecting)
  //       setIntersecting(entry.isIntersecting)
  //     },
  //     {
  //       rootMargin: `${-margin}px`,
  //     }
  //   )
  //   if (ref.current) {
  //     observer.observe(ref.current)
  //   }
  //   return () => {
  //     observer.unobserve(ref.current)
  //   }
  // }, [])

  return isIntersecting
}
