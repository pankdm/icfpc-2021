import { vecMean, vecAdd, vecSub, distance, vecNorm, vecMult, vecClampAbs, vecRand, isVecZero } from './graph.js'

export const getLinearFravityForce = (point, gravityCenter, gravityConst=100) => {
  const toGravityCenter = vecSub(gravityCenter, point)
  if (isVecZero(toGravityCenter)) {
    return [0, 0]
  }
  return vecClampAbs(vecMult(toGravityCenter, gravityConst), 0, gravityConst)
}
export const getRepelForce = (point, otherPoint, repelConst=3000, maxRepel=1000) => {
  const fromOtherPoint = vecSub(point, otherPoint)
  if (isVecZero(fromOtherPoint)) {
    return vecRand(maxRepel)
  }
  const dist = distance(point, otherPoint)
  return vecClampAbs(vecMult(fromOtherPoint, repelConst/dist**3), 0, maxRepel)
}
const getSpringForce = (point, otherPoint, optimalDistance, springConst=50) => vecMult(vecNorm(vecSub(point, otherPoint)), springConst * (1 - distance(point, otherPoint) / optimalDistance))

export const relaxVertices = (vertices, optimalDistancesMap, gravityCenter, timeStep=0.01) => {
  const meanCoords = vecMean(vertices)
  const gravity = getLinearFravityForce(meanCoords, gravityCenter)
  const newVertices = vertices.map((v, idx) => {
    let sumForce = gravity
    vertices.forEach((ov, ovIdx) => {
      if (ov == v) return
      const repelForce = getRepelForce(v, ov)
      sumForce = vecAdd(sumForce, repelForce)
      const optimalDistance = optimalDistancesMap[idx][ovIdx] || null
      if (optimalDistance) {
        const springForce = getSpringForce(v, ov, optimalDistance)
        sumForce = vecAdd(sumForce, springForce)
      }
    })
    return vecAdd(v, vecMult(sumForce, timeStep))
  })
  return newVertices
}
