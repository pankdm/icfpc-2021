export const sleep = (delayMs=1000) => new Promise(res => setTimeout(res, delayMs))

export const shakeCoord = (coord, amplitude=1) => coord + amplitude*(Math.random()-0.5)/0.5

export const shakePoint = ([x, y], amplitude=1) => {
  const randAngle = Math.random() * 2*Math.PI
  return [x + amplitude*Math.cos(randAngle), y + amplitude*Math.sin(randAngle)]
}

export function naturalSort(a, b) {
  const numA = parseInt(a)
  const numB = parseInt(b)
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB
  } else if (!isNaN(numA)) {
    return -1
  } else if (!isNaN(numB)) {
    return 1
  } else {
    return a.localeCompare(b)
  }
}
