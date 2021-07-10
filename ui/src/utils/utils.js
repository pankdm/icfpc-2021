import _ from 'lodash'

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

export function lerp(fromValue, toValue, alpha) {
  const _alpha = Math.min(Math.max(alpha, 0), 1)
  return (toValue - fromValue) * _alpha + fromValue
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function hexToColorHex(color) {
  return '#' + color.toString(16).padStart(6, '0')
}

export function hexColorToRGB(hexColor) {
  if (_.isString(hexColor)) {
    if (hexColor[0] == '#') {
      hexColor = hexColor.slice(1)
    }
    hexColor = parseInt(hexColor, 16)
  }
  const r = (hexColor >> 16 & 255) / 255
  const g = (hexColor >> 8 & 255) / 255
  const b = (hexColor & 255) / 255
  return [r, g, b]
}

export function RGBToHexColor(r, g, b) {
  return '#'
    + Math.round(255*r).toString(16).padStart(2, '0')
    + Math.round(255*g).toString(16).padStart(2, '0')
    + Math.round(255*b).toString(16).padStart(2, '0')
}

export function hexColorLerp(fromHexColor, toHexColor, alpha) {
  const [rFrom, gFrom, bFrom] = hexColorToRGB(fromHexColor)
  const [rTo, gTo, bTo] = hexColorToRGB(toHexColor)
  const r = lerp(rFrom, rTo, alpha)
  const g = lerp(gFrom, gTo, alpha)
  const b = lerp(bFrom, bTo, alpha)
  return RGBToHexColor(r, g, b)
}

function euclideanModulo(n, m) {
  return ((n % m) + m) % m
}
function hue2rgb(p, q, t) {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * 6 * (2 / 3 - t)
  return p
}

export function RGBToHSL(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let hue, saturation
  const lightness = (min + max) / 2.0
  if (min === max) {
    hue = 0
    saturation = 0
  } else {
    const delta = max - min
    saturation = lightness <= 0.5 ? delta / (max + min) : delta / (2 - max - min)
    switch (max) {
      case r:
        hue = (g - b) / delta + (g < b ? 6 : 0)
        break
      case g:
        hue = (b - r) / delta + 2
        break
      case b:
        hue = (r - g) / delta + 4
        break
    }
    hue /= 6
  }
  return [hue, saturation, lightness]
}

export function hexColorToHSL(hexColor) {
  const [r, g, b] = hexColorToRGB(hexColor)
  return RGBToHSL(r, g, b)
}

export function HSLToHexColor(h, s, l) {
  const [r, g, b] = HSLToRGB(h, s, l)
  return RGBToHexColor(r, g, b)
}

export function HSLToRGB(h, s, l) {
  h = euclideanModulo(h, 1)
  s = clamp(s, 0, 1)
  l = clamp(l, 0, 1)
  if (s === 0) {
    return [l, l, l]
  } else {
    const p = l <= 0.5 ? l * (1 + s) : l + s - (l * s)
    const q = (2 * l) - p
    return [
      hue2rgb(q, p, h + 1 / 3),
      hue2rgb(q, p, h),
      hue2rgb(q, p, h - 1 / 3),
    ]
  }
}

export function hexColorLerpHSL(fromHexColor, toHexColor, alpha) {
  const [hFrom, sFrom, lFrom] = hexColorToHSL(fromHexColor)
  const [hTo, sTo, lTo] = hexColorToHSL(toHexColor)
  const h = lerp(hFrom, hTo, alpha)
  const s = lerp(sFrom, sTo, alpha)
  const l = lerp(lFrom, lTo, alpha)
  return HSLToHexColor(h, s, l)
}
