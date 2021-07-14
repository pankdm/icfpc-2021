import _ from 'lodash'

export function distanceSq(p1, p2) {
  const [x1, y1] = p1
  const [x2, y2] = p2
  return (x1-x2)**2 + (y1-y2)**2
}
export function distance(p1, p2) {
  return Math.sqrt(distanceSq(p1, p2))
}

// immutable vector operations
export const vecEquals = (vec1, vec2) => vec1[0] == vec2[0] && vec1[1] == vec2[1]
export const vecAdd = (...vecs) => [_.sumBy(vecs, 0), _.sumBy(vecs, 1)]
export const vecSub = (vec1, vec2) => [vec1[0]-vec2[0], vec1[1]-vec2[1]]
export const vecAbs = (vec) => distance([0, 0], vec)
export const vecMult = (vec, scalar) => [vec[0]*scalar, vec[1]*scalar]
export const vecSetAbs = (vec, newAbs) => {
  if (newAbs == 0) {
    return [0, 0]
  }
  return vecMult(vec, newAbs/vecAbs(vec))
}
export const vecClampAbs = (vec, minAbs, maxAbs) => {
  const abs = vecAbs(vec)
  const newAbs = Math.min(Math.max(abs, minAbs), maxAbs)
  return vecSetAbs(vec, newAbs)
}
export const vecRound = (vec, precision) => vec.map(v => _.round(v, precision))
export const vecNorm = (vec) => vecSetAbs(vec, 1)
export const vecMean = (vecs) => [_.sumBy(vecs, 0) / vecs.length, _.sumBy(vecs, 1) / vecs.length]
export const vecRand = (abs=1) => {
  const randAngle = Math.random()*2*Math.PI
  return [abs*Math.cos(randAngle), abs*Math.sin(randAngle)]
}
export const getPointSideRelativeToVector = (vec, point) => {
  const [vx, vy] = vec
  const [px, py] = point
  return Math.sign(vx*py-vy*px)
}
export const checkEdgesIntersect = (edge1, edge2) => {
  const [[e11x, e11y], [e12x, e12y]] = edge1
  const [[e21x, e21y], [e22x, e22y]] = edge2
  const s1 = getPointSideRelativeToVector(vecSub([e11x, e11y], [e12x, e12y]), vecSub([e21x, e21y], [e12x, e12y]))
  const s2 = getPointSideRelativeToVector(vecSub([e11x, e11y], [e12x, e12y]), vecSub([e22x, e22y], [e12x, e12y]))
  const s3 = getPointSideRelativeToVector(vecSub([e21x, e21y], [e22x, e22y]), vecSub([e11x, e11y], [e22x, e22y]))
  const s4 = getPointSideRelativeToVector(vecSub([e21x, e21y], [e22x, e22y]), vecSub([e12x, e12y], [e22x, e22y]))
  return s1 != 0
      && s2 != 0
      && s3 != 0
      && s4 != 0
      && s1 != s2
      && s3 != s4
}
// mutating vector operations
export const vecAdd_ = (vec, ...vecs) => {
  vec[0] += _.sumBy(vecs, 0)
  vec[1] += _.sumBy(vecs, 1)
  return vec
}
export const vecMult_ = (vec, scalar) => {
  vec[0] *= scalar
  vec[1] *= scalar
  return vec
}
export const vecSub_ = (vec, ...vecs) => {
  vec[0] -= _.sumBy(vecs, 0)
  vec[1] -= _.sumBy(vecs, 1)
  return vec
}
export const vecSetAbs_ = (vec, newAbs) => {
  if (newAbs == 0) {
    vec[0] = 0
    vec[1] = 0
    return vec
  }
  return vecMult_(vec, newAbs/vecAbs(vec))
}
export const vecClampAbs_ = (vec, minAbs, maxAbs) => {
  const abs = vecAbs(vec)
  const newAbs = Math.min(Math.max(abs, minAbs), maxAbs)
  return vecSetAbs_(vec, newAbs)
}
export const vecNorm_ = (vec) => vecSetAbs_(vec, 1)

export const isVecZero = (vec) => vec[0]==0&&vec[1]==0
export const snapVecs = (vecs) => {
  return _.map(vecs, v => [Math.round(v[0]), Math.round(v[1])])
}

export function getDistances(points, edges) {
  return edges.map(([p1, p2]) => distance(points[p1], points[p2]))
}
export function getDistanceMap(points, edges) {
  const map = {}
  edges.forEach(([p1, p2]) => {
    const dist = distance(points[p1], points[p2])
    map[p1] = map[p1] || {}
    map[p1][p2] = dist
    map[p2] = map[p2] || {}
    map[p2][p1] = dist
  })
  points.forEach((p, idx) => {
    if (!map[idx]) {
      map[idx] = {}
    }
  })
  return map
}

export function getNearest(point, vertices) {
  return _.minBy(vertices, v => distanceSq(point, v))
}

export function distanceSqToNearest(point, vertices) {
  return distanceSq(point, getNearest(point, vertices))
}

export function getScore(holeVertices, figureVertices) {
  return _.sumBy(holeVertices, v => distanceSqToNearest(v, figureVertices))
}
