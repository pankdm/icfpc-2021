import { vecAdd, vecSub, distance, vecMult, vecClampAbs, vecRand, isVecZero, vecAbs, vecMean, vecAdd_ } from './graph.js'
import _ from 'lodash'
import { defineGlobalVar } from './useGlobalVar.js'

const GLOBAL_FORCE_CONSTS = {
  springConst: 200,
  inflateConst: 150,
  inflateSteepPower: 2.5,
  inflateMaxForce: 100,
  stretchConst: 50,
  stretchSteepPower: 2,
  stretchMaxForce: 100,
  gravityConst: 50,
  gravitySteepPower: 2,
  gravityMaxForce: 100,
  holeGravityConst: 150,
  holeGravitySteepPower: 3,
  holeGravityMaxForce: 100,
}

// global obj to mutate above values
export const FORCE_CONSTS = defineGlobalVar(GLOBAL_FORCE_CONSTS)
window.FORCE_CONSTS = FORCE_CONSTS
const TIME_STEP = 0.01
const ZERO_VEC = [0, 0]

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
const getSpringForce = (point, otherPoint, { optimalDistance, springConst }) => {
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

export const applyConstraints = (vertices, { optimalDistancesMap, frozenPoints }) => {
  const { springConst } = GLOBAL_FORCE_CONSTS
  const getTensionForce = (v, idx) => {
    if (frozenPoints && frozenPoints.has(idx)) {
      return ZERO_VEC
    }
    let sumForce = [0,0]
    vertices.forEach((ov, ovIdx) => {
      if (ov == v) return
      const optimalDistance = optimalDistancesMap[idx][ovIdx] || null
      if (optimalDistance) {
        const springForce = getSpringForce(v, ov, { optimalDistance, springConst })
        sumForce = vecAdd_(sumForce, springForce)
      }
    })
    return sumForce
  }
  return mapApplyForce(vertices, getTensionForce)
}

export const applyGravity = (vertices, { frozenPoints }) => {
  const gravityCenter = vecMean(vertices)
  const { gravityConst, gravitySteepPower } = GLOBAL_FORCE_CONSTS
  const getGravityForce = (v, idx) => {
    if (frozenPoints && frozenPoints.has(idx)) {
      return ZERO_VEC
    }
    return getAttractForce(v, gravityCenter, { attractConst: gravityConst, steepPower: gravitySteepPower })
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

export const inflate = (vertices, { steepPower, repelConst, maxForce, frozenPoints }) => {
  const getInflateForce = (v, idx) => {
    if (frozenPoints && frozenPoints.has(idx)) {
      return ZERO_VEC
    }
    let repelForce = [0, 0]
    vertices.forEach((ov, ovIdx) => {
      if (ov == v) return
      const _repelForce = getRepelForce(v, ov, { steepPower, repelConst, maxForce })
      repelForce = vecAdd_(repelForce, _repelForce)
    })
    return repelForce
  }
  return mapApplyForce(vertices, getInflateForce)
}

// Top Level Anim Loop Simulation Functions
export const stretchLoop = (vertices, { optimalDistancesMap, frozenPoints }) => {
  const { stretchConst, stretchSteepPower, stretchMaxForce } = GLOBAL_FORCE_CONSTS
  vertices = inflate(vertices, { frozenPoints, repelConst: stretchConst, steepPower: stretchSteepPower, maxForce: stretchMaxForce })
  vertices = applyConstraints(vertices, { optimalDistancesMap, frozenPoints })
  return vertices
}
export const inflateLoop = (vertices, { optimalDistancesMap, frozenPoints }) => {
  const { inflateConst, inflateSteepPower, inflateMaxForce } = GLOBAL_FORCE_CONSTS
  vertices = inflate(vertices, { frozenPoints, repelConst: inflateConst, steepPower: inflateSteepPower, maxForce: inflateMaxForce })
  vertices = applyConstraints(vertices, { optimalDistancesMap, frozenPoints })
  return vertices
}

export const relaxLoop = (vertices, { optimalDistancesMap, frozenPoints }) => {
  return applyConstraints(vertices, { optimalDistancesMap, frozenPoints })
}

export const gravityLoop = (vertices, { frozenPoints }) => {
  return applyGravity(vertices, { frozenPoints })
}

export const winningGraityLoop = (vertices, { holeVertcies, frozenPoints }) => {
  const { holeGravityConst, holeGravitySteepPower } = GLOBAL_FORCE_CONSTS
  return applyMultiGravity(vertices, { gravityPoints: holeVertcies, steepPower: holeGravitySteepPower, gravityConst: holeGravityConst, frozenPoints })
}
