import { vecAdd, vecSub, distance, vecMult, vecClampAbs, vecRand, isVecZero, vecAbs, vecMean } from './graph.js'
import _ from 'lodash'

const FORCE_DEFAULTS = {
  gravityConst: 100,
  simpleRepelConst: 10,
  repelConst: 50,
  maxRepel: 100,
  springConst: 200,
}
const TIME_STEP = 0.01

export const getLinearFravityForce = (point, gravityCenter, gravityConst=FORCE_DEFAULTS.gravityConst) => {
  const toGravityCenter = vecSub(gravityCenter, point)
  if (isVecZero(toGravityCenter)) {
    return [0, 0]
  }
  return vecClampAbs(vecMult(toGravityCenter, gravityConst), 0, gravityConst)
}
export const getSimpleRadialForce = (point, meanPoint, simpleRepelConst=FORCE_DEFAULTS.simpleRepelConst) => {
  const radialVec = vecSub(point, meanPoint)
  if (isVecZero(radialVec)) {
    return vecRand()
  }
  const dist = vecAbs(radialVec)
  const radialUnitVec = vecMult(radialVec, 1/dist)
  return vecClampAbs(vecMult(radialUnitVec, simpleRepelConst), 0, simpleRepelConst)
}
export const getRepelForce = (point, otherPoint, repelConst=50, maxRepel=100) => {
  const fromOtherPoint = vecSub(point, otherPoint)
  if (isVecZero(fromOtherPoint)) {
    return vecRand(maxRepel)
  }
  const dist = distance(point, otherPoint)
  return vecClampAbs(vecMult(fromOtherPoint, repelConst/dist**2), 0, maxRepel)
}
const getSpringForce = (point, otherPoint, optimalDistance, springConst=FORCE_DEFAULTS.springConst) => {
  const dist = distance(point, otherPoint)
  return vecMult(vecSub(point, otherPoint), springConst * (1 / dist - 1 / optimalDistance))
}

const applyForce = (vec, force) => vecAdd(vec, vecMult(force, TIME_STEP))

export const applyConstraints = (vertices, { optimalDistancesMap, frozenPoints }) => {
  const newVertices = vertices.map((v, idx) => {
    let sumForce = [0,0]
    vertices.forEach((ov, ovIdx) => {
      if (frozenPoints.indexOf(idx) > 0) {
        return v
      }
      if (ov == v) return
      const optimalDistance = optimalDistancesMap[idx][ovIdx] || null
      if (optimalDistance) {
        const springForce = getSpringForce(v, ov, optimalDistance)
        sumForce = vecAdd(sumForce, springForce)
      }
    })
    return applyForce(v, sumForce)
  })
  return newVertices
}

export const applyGravity = (vertices, { meanCoords, gravityCenter, frozenPoints }) => {
  const gravity = getLinearFravityForce(meanCoords, gravityCenter)
  const newVertices = vertices.map((v, idx) => {
    if (frozenPoints.indexOf(idx) > 0) {
      return v
    }
    return applyForce(v, gravity)
  })
  return newVertices
}

export const applyShake = (vertices, { maxAmplitude }) => {
  const newVertices = vertices.map((v, idx) => {
    const randForce = vecRand(Math.random()*maxAmplitude/TIME_STEP)
    return applyForce(v, randForce)
  })
  return newVertices
}

export const inflateSimpleRadial = (vertices, { meanCoords, simpleRepelConst, frozenPoints }) => {
  const newVertices = vertices.map((v, idx) => {
    if (frozenPoints.indexOf(idx) > 0) {
      return v
    }
    let repelForce = getSimpleRadialForce(v, meanCoords, simpleRepelConst)
    return applyForce(v, repelForce)
  })
  return newVertices
}

export const inflate = (vertices, { repelConst, maxRepel, frozenPoints }) => {
  const newVertices = vertices.map((v, idx) => {
    if (frozenPoints.indexOf(idx) > 0) {
      return v
    }
    let repelForce = [0, 0]
    vertices.forEach((ov, ovIdx) => {
      if (ov == v) return
      const _repelForce = getRepelForce(v, ov, repelConst, maxRepel)
      repelForce = vecAdd(repelForce, _repelForce)
    })
    return applyForce(v, repelForce)
  })
  return newVertices
}

// Top Level Anim Loop Simulation Functions
export const inflateLoop = (vertices, { optimalDistancesMap, frozenPoints=[] }) => {
  vertices = inflate(vertices, { frozenPoints })
  vertices = applyConstraints(vertices, { optimalDistancesMap, frozenPoints })
  return vertices
}

export const inflateSimpleRadialLoop = (vertices, { optimalDistancesMap, frozenPoints=[] }) => {
  const meanCoords = vecMean(vertices)
  vertices = inflateSimpleRadial(vertices, { meanCoords, frozenPoints })
  vertices = applyConstraints(vertices, { optimalDistancesMap, frozenPoints })
  return vertices
}

export const relaxLoop = (vertices, { optimalDistancesMap, frozenPoints=[] }) => {
  return applyConstraints(vertices, { optimalDistancesMap, frozenPoints })
}

export const gravityLoop = (vertices, { gravityCenter, frozenPoints=[] }) => {
  const meanCoords = vecMean(vertices)
  return applyGravity(vertices, { meanCoords, gravityCenter, frozenPoints })
}
