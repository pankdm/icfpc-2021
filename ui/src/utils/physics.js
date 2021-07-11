import { vecAdd, vecSub, distance, vecMult, vecClampAbs, vecRand, isVecZero, vecAbs, vecMean, vecAdd_ } from './graph.js'
import _ from 'lodash'

const FORCE_DEFAULTS = {
  gravityConst: 100,
  simpleRepelConst: 10,
  repelConst: 50,
  maxRepel: 100,
  springConst: 200,
}
const TIME_STEP = 0.01
const ZERO_VEC = [0, 0]

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
export const getAttractForce = (point, otherPoint, { steepPower=3, attractConst=50, maxAttract=100 }) => {
  const toOtherPoint = vecSub(otherPoint, point)
  if (isVecZero(toOtherPoint)) {
    return vecRand(maxAttract)
  }
  const dist = distance(point, otherPoint)
  return vecClampAbs(vecMult(toOtherPoint, attractConst/(dist**steepPower)), 0, Math.min(dist, maxAttract))
}
export const getRepelForce = (point, otherPoint, repelConst=50, maxRepel=100) => {
  const fromOtherPoint = vecSub(point, otherPoint)
  if (isVecZero(fromOtherPoint)) {
    return vecRand(maxRepel)
  }
  const dist = distance(point, otherPoint)
  return vecClampAbs(vecMult(fromOtherPoint, repelConst/(dist**2)), 0, maxRepel)
}
const getSpringForce = (point, otherPoint, optimalDistance, springConst=FORCE_DEFAULTS.springConst) => {
  const dist = distance(point, otherPoint)
  let mult = springConst * (1 / dist - 1 / optimalDistance)
  // HACK: cap spring force, to avoid small edges oscillating
  mult = Math.sign(mult) * Math.min(Math.abs(mult), dist*0.75)
  return vecMult(vecSub(point, otherPoint), mult)
}

// immutable apply force
const applyForce = (vec, force) => vecAdd(vec, vecMult(force, TIME_STEP))
// mutating apply force
const applyForce_ = (vec, force) => vecAdd_(vec, vecMult(force, TIME_STEP))

// immutable map-apply force
const mapApplyForce = (vertices, forceFn) => vertices.map((v, idx) => applyForce(v, forceFn(v, idx)))
// mutating map-apply force
const mapApplyForce_ = (vertices, forceFn) => vertices.forEach((v, idx) => applyForce_(v, forceFn(v, idx)))

export const applyConstraints = (vertices, { optimalDistancesMap, frozenPoints, mutate=false }) => {
  const getTensionForce = (v, idx) => {
    if (frozenPoints && frozenPoints.has(idx)) {
      return ZERO_VEC
    }
    let sumForce = [0,0]
    vertices.forEach((ov, ovIdx) => {
      if (ov == v) return
      const optimalDistance = optimalDistancesMap[idx][ovIdx] || null
      if (optimalDistance) {
        const springForce = getSpringForce(v, ov, optimalDistance)
        sumForce = vecAdd_(sumForce, springForce)
      }
    })
    return sumForce
  }
  return mapApplyForce(vertices, getTensionForce)
}

export const applyGravity = (vertices, { meanCoords, gravityCenter, frozenPoints }) => {
  const getGravityForce = (v, idx) => {
    if (frozenPoints && frozenPoints.has(idx)) {
      return ZERO_VEC
    }
    return getLinearFravityForce(meanCoords, gravityCenter)
  }
  return mapApplyForce(vertices, getGravityForce)
}

export const applyMultiGravity = (vertices, { gravityPoints, gravityConst, maxGravity, steepPower, frozenPoints }) => {
  const getMultiGravityForce = (v, idx) => {
    if (frozenPoints && frozenPoints.has(idx)) {
      return ZERO_VEC
    }
    let sumForce = [0,0]
    gravityPoints.forEach((g) => {
      sumForce = vecAdd_(sumForce, getAttractForce(v, g, { gravityConst, maxGravity, steepPower }))
    })
    return sumForce
  }
  return mapApplyForce(vertices, getMultiGravityForce)
}

export const applyShake = (vertices, { maxAmplitude, frozenPoints }) => {
  const newVertices = vertices.map((v, idx) => {
    if (frozenPoints && frozenPoints.has(idx)) {
      return v
    }
    const randForce = vecRand(Math.random()*maxAmplitude/TIME_STEP)
    return applyForce(v, randForce)
  })
  return newVertices
}

export const inflateSimpleRadial = (vertices, { meanCoords, simpleRepelConst, frozenPoints }) => {
  const getInflateForce = (v, idx) => {
    if (frozenPoints && frozenPoints.has(idx)) {
      return ZERO_VEC
    }
    let repelForce = getSimpleRadialForce(v, meanCoords, simpleRepelConst)
    return repelForce
  }
  return mapApplyForce(vertices, getInflateForce)
}

export const inflate = (vertices, { repelConst, maxRepel, frozenPoints }) => {
  const getInflateForce = (v, idx) => {
    if (frozenPoints && frozenPoints.has(idx)) {
      return ZERO_VEC
    }
    let repelForce = [0, 0]
    vertices.forEach((ov, ovIdx) => {
      if (ov == v) return
      const _repelForce = getRepelForce(v, ov, repelConst, maxRepel)
      repelForce = vecAdd_(repelForce, _repelForce)
    })
    return repelForce
  }
  return mapApplyForce(vertices, getInflateForce)
}

// Top Level Anim Loop Simulation Functions
export const inflateLoop = (vertices, { optimalDistancesMap, frozenPoints }) => {
  vertices = inflate(vertices, { frozenPoints })
  vertices = applyConstraints(vertices, { optimalDistancesMap, frozenPoints })
  return vertices
}

export const inflateSimpleRadialLoop = (vertices, { optimalDistancesMap, frozenPoints }) => {
  const meanCoords = vecMean(vertices)
  vertices = inflateSimpleRadial(vertices, { meanCoords, frozenPoints })
  vertices = applyConstraints(vertices, { optimalDistancesMap, frozenPoints })
  return vertices
}

export const relaxLoop = (vertices, { optimalDistancesMap, frozenPoints }) => {
  return applyConstraints(vertices, { optimalDistancesMap, frozenPoints })
}

export const gravityLoop = (vertices, { gravityCenter, frozenPoints }) => {
  const meanCoords = vecMean(vertices)
  return applyGravity(vertices, { meanCoords, gravityCenter, frozenPoints })
}

export const winningGraityLoop = (vertices, { holeVertcies, frozenPoints }) => {
  return applyMultiGravity(vertices, { gravityPoints: holeVertcies, steepPower:3, frozenPoints })
}
