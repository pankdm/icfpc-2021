import { vecAdd, vecSub, distance, vecMult, vecClampAbs, vecRand, isVecZero, vecAbs, vecMean, vecAdd_ } from './graph.js'
import _ from 'lodash'
import { defineGlobalVar } from './useGlobalVar.js'

const GLOBAL_FORCE_CONSTS = {
  linearGravityConst: 100,
  holeGravityConst: 50,
  simpleRepelConst: 10,
  repelConst: 50,
  maxRepel: 100,
  springConst: 200,
}

// global obj to mutate above values
export const FORCE_CONSTS = defineGlobalVar(GLOBAL_FORCE_CONSTS)
window.FORCE_CONSTS = FORCE_CONSTS
const TIME_STEP = 0.01
const ZERO_VEC = [0, 0]

export const getLinearFravityForce = (point, gravityCenter) => {
  const toGravityCenter = vecSub(gravityCenter, point)
  if (isVecZero(toGravityCenter)) {
    return [0, 0]
  }
  const { linearGravityConst } = GLOBAL_FORCE_CONSTS
  return vecClampAbs(vecMult(toGravityCenter, linearGravityConst), 0, linearGravityConst)
}
export const getAttractForce = (point, otherPoint, { steepPower=2, attractConst=50, maxForce=100 }) => {
  const toOtherPoint = vecSub(otherPoint, point)
  if (isVecZero(toOtherPoint)) {
    return vecRand(maxForce)
  }
  const dist = distance(point, otherPoint)
  return vecClampAbs(vecMult(toOtherPoint, attractConst/(dist**steepPower)), 0, Math.min(dist, maxForce))
}
export const getRepelForce = (point, otherPoint, { steepPower=2, repelConst=50, maxForce=100 }) => {
  const fromOtherPoint = vecSub(point, otherPoint)
  if (isVecZero(fromOtherPoint)) {
    return vecRand(maxForce)
  }
  const dist = distance(point, otherPoint)
  return vecClampAbs(vecMult(fromOtherPoint, repelConst/(dist**steepPower)), 0, maxForce)
}
const getSpringForce = (point, otherPoint, { optimalDistance }) => {
  const dist = distance(point, otherPoint)
  const { springConst } = GLOBAL_FORCE_CONSTS
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
        const springForce = getSpringForce(v, ov, { optimalDistance })
        sumForce = vecAdd_(sumForce, springForce)
      }
    })
    return sumForce
  }
  return mapApplyForce(vertices, getTensionForce)
}

export const applyGravity = (vertices, { gravityCenter, frozenPoints }) => {
  const getGravityForce = (v, idx) => {
    if (frozenPoints && frozenPoints.has(idx)) {
      return ZERO_VEC
    }
    return getLinearFravityForce(v, gravityCenter)
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
      sumForce = vecAdd_(sumForce, getAttractForce(v, g, { attractConst: gravityConst, maxForce: maxGravity, steepPower }))
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

export const inflate = (vertices, { steepPower, repelConst, maxRepel, frozenPoints }) => {
  const getInflateForce = (v, idx) => {
    if (frozenPoints && frozenPoints.has(idx)) {
      return ZERO_VEC
    }
    let repelForce = [0, 0]
    vertices.forEach((ov, ovIdx) => {
      if (ov == v) return
      const _repelForce = getRepelForce(v, ov, { steepPower, repelConst, maxForce: maxRepel })
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
export const inflateLocalLoop = (vertices, { optimalDistancesMap, frozenPoints }) => {
  vertices = inflate(vertices, { frozenPoints, steepPower: 2.5 })
  vertices = applyConstraints(vertices, { optimalDistancesMap, frozenPoints })
  return vertices
}

export const relaxLoop = (vertices, { optimalDistancesMap, frozenPoints }) => {
  return applyConstraints(vertices, { optimalDistancesMap, frozenPoints })
}

export const gravityLoop = (vertices, { frozenPoints }) => {
  const meanCoords = vecMean(vertices)
  return applyGravity(vertices, { gravityCenter: meanCoords, frozenPoints })
}

export const winningGraityLoop = (vertices, { holeVertcies, frozenPoints }) => {
  return applyMultiGravity(vertices, { gravityPoints: holeVertcies, steepPower: 3, frozenPoints })
}
