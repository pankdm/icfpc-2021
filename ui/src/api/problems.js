import { useQuery } from 'react-query'

const API_ROOT = 'api'

const fetchJson = (url) => fetch(url).then(r => r.json())

export function useProblem(problemId, opts={}) {
  return useQuery(`problem_${problemId}`, () => fetchJson(`${API_ROOT}/problems/${problemId}`), opts)
}
