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

export function saveSolution(problemId, username, solution, forSubmit=false) {
  return fetch(`${API_ROOT}/solutions/${problemId}?alias=${username}&forSubmit=${forSubmit}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(solution),
  })
}

export function useStats(opts={}) {
  return useQuery('stats', () => fetchJson(`${API_ROOT}/stats`), opts)
}

export function useProblemsAll(opts={}) {
  return useQuery('propblems/all', () => fetchJson(`${API_ROOT}/problems/all`), opts)
}