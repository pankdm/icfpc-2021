import _ from 'lodash'
import { useQuery } from 'react-query'

const API_ROOT = 'api'

const fetchJson = (url, opts) => fetch(url, opts).then(r => r.json())

export function useProblems(opts={}) {
  return useQuery(`problems`, () => fetchJson(`${API_ROOT}/problems`), opts)
}

export function useProblem(problemId, opts={}) {
  return useQuery(`problem_${problemId}`, () => fetchJson(`${API_ROOT}/problems/${problemId}`), opts)
}

export function useSolutions(problemId, opts={}) {
  const defaultOpts = {
    cacheTime: 0,
  }
  const finalOpts = _.merge(defaultOpts, opts)
  return useQuery(`solutions_${problemId}`, () => fetchJson(`${API_ROOT}/solutions/${problemId}`), finalOpts)
}

export function useSolution(problemId, solutionId, opts={}) {
  const defaultOpts = {
    cacheTime: 0,
  }
  const finalOpts = _.merge(defaultOpts, opts)
  return useQuery(`solution_${solutionId}`, () => fetchJson(`${API_ROOT}/solutions/${problemId}?solutionKey=${encodeURIComponent(solutionId)}`), finalOpts)
}

export function saveSolution(problemId, solution) {
  return fetch(`${API_ROOT}/solutions/${problemId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(solution),
  })
}
