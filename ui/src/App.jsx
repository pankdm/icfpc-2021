import React, { useState } from 'react'
import _ from 'lodash'
import Flex from './components/Flex.jsx'
import ProblemViewer from './components/ProblemViewer.jsx'
import styles from './App.module.css'
import useLocalStorage from './utils/useLocalStorage.js'
import { useProblems, useProblem, useSolutions, useSolution } from './api/problems'

function App() {
  const [problemId, setProblemId] = useLocalStorage('problemId', 1)
  const [solutionId, setSolutionId] = useState(null)
  const { data: problems } = useProblems()
  const { data: problem } = useProblem(problemId, { enabled: !!problemId })
  const { data: solutions } = useSolutions(problemId, { enabled: !!problemId, refetchInterval: 1000 })
  const { data: solution, refetch: refetchSolution } = useSolution(problemId, solutionId, { enabled: !!problemId && !!solutionId })
  return (
    <div className={styles.app}>
      <h1>Welcome to ICFPC 2021!</h1>
      <p>
        Choose your destiny:
        {` `}
        {problems &&
          <select
            value={problemId}
            onChange={e => {
              setProblemId(e.target.value)
              setSolutionId(null)
            }}
          >
            {_.map(
              problems,
              (id) => <option key={id} value={id.toString()}>{id}</option>
            )}
          </select>
        }
        {` `}
        Display solution:
        {` `}
        <select
          value={solutionId || 'NONE'}
          onChange={e => {
            const { value } = e.target
            setSolutionId(value == 'NONE' ? null : value)
          }}
        >
          <option value='NONE'>None</option>
          {solutions &&
            _.map(
              solutions,
              (id) => <option key={id} value={id.toString()}>{id}</option>
            )
          }
        </select>
        {` `}
        {solutionId &&
          <span className={styles.refreshLabel} onClick={() => refetchSolution()}>Refresh</span>
        }
      </p>
      {problem &&
        <ProblemViewer key={problemId} problem={problem} solution={solution} />
      }
    </div>
  )
}

export default App
