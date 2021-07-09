import { useQuery } from 'react-query'

const API_ROOT = 'api'

const fetchJson = (url) => fetch(url).then(r => r.json())

export function useProblems(opts={}) {
  return useQuery(`problems`, () => fetchJson(`${API_ROOT}/problems`), opts)
}

export function useProblem(problemId, opts={}) {
  return useQuery(`problem_${problemId}`, () => fetchJson(`${API_ROOT}/problems/${problemId}`), opts)
}
