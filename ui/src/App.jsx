import React from 'react'
import _ from 'lodash'
import ProblemViewer from './components/ProblemViewer.jsx'
import styles from './App.module.css'
import useLocalStorage from './utils/useLocalStorage.js'
import { useProblem } from './api/problems'

function App() {
  const [problemId, setProblemId] = useLocalStorage('problemId', 1)
  const { isLoading, error, data: problem } = useProblem(problemId, { enabled: !!problemId })
  if (problem) {
    problem.figure.vertices[0][0] = 2
  }
  return (
    <div className={styles.app}>
      <h1>Welcome to ICFPC 2021!</h1>
      <p>
        Choose your destiny:
        {` `}
        <select
          value={problemId}
          onChange={e => setProblemId(e.target.value)}
        >
          {_.map(
            _.range(1, 60),
            (id) => <option key={id} value={id.toString()}>{id}</option>
          )}
        </select>
      </p>
      {problem &&
        <ProblemViewer key={problemId} problem={problem} />
      }
    </div>
  )
}

export default App
