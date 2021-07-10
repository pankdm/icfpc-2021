import _ from 'lodash'

export function distanceSq(p1, p2) {
  const [x1, y1] = p1
  const [x2, y2] = p2
  return (x1-x2)**2 + (y1-y2)**2
}
export function distance(p1, p2) {
  return Math.sqrt(distanceSq(p1, p2))
}

export class Vec {
  constructor(x=0, y=0) {
    this._vec = [x, y]
  }
  static random(abs=1) {
    const [x, y] = vecRand(abs)
    return new Vec(x, y)
  }
  toString = () => `(${this._vec[0]}, ${this._vec[1]})`
  toList = () => [...this._vec]
  static fromLists = (vecs) => vecs.map(v => new Vec(...v))
  static toLists = (Vecs) => Vecs.map(V => V.toList())
  add = (...vecs) => {
    for (v of vecs) {
      this._vec[0] += v[0]
      this._vec[1] += v[1]
    }
    return this
  }
  sub = (vec) => {
    this._vec[0] -= vec[0]
    this._vec[1] -= vec[1]
    return this
  }
  abs = () => {
    distance([0, 0], this._vec)
  }
  mult = (scalar) => {
    this._vec[0] *= scalar
    this._vec[1] *= scalar
    return this
  }
  normalize = () => {
    const abs = this.abs()
    if (abs == 0) {
      throw new Error('Cannot normalize zero-length vector')
    }
    return this.mult(1/abs)
  }
  setAbs = (newAbs) => {
    const abs = this.abs()
    if (abs == 0) {
      throw new Error('Cannot call setAbs on zero-length vector')
    }
    return this.mult(newAbs/abs)
  }
  clampAbs = (minAbs, maxAbs) => {
    const abs = this.abs()
    if (abs == 0 && minAbs > 0) {
      throw new Error('Cannot call clampAbs with mositive minAbs on zero-length vector')
    }
    const newAbs = Math.min(Math.max(abs, minAbs), maxAbs)
    return self.setAbs(newAbs)
  }
}

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
export const vecNorm = (vec) => vecSetAbs(vec, 1)
export const vecMean = (vecs) => [_.sumBy(vecs, 0) / vecs.length, _.sumBy(vecs, 1) / vecs.length]
export const vecRand = (abs=1) => {
  const randAngle = Math.random()*2*Math.PI
  return [abs*Math.cos(randAngle), abs*Math.sin(randAngle)]
}
export const isVecZero = (vec) => vec[0]==0&&vec[1]==0

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
