import React, { useState } from 'react'
import _ from 'lodash'
import NavHeader from '../NavHeader.jsx'
import styles from './Problems.module.css'
import ProblemViewer from '../components/ProblemViewer.jsx'
import ScrollToTop from '../components/helpers/ScrollToTop.jsx'
import useSearchQuery from '../utils/useSearchQuery.js'
import { useProblems, useProblem, useSolutions, useSolution, saveSolution, useStats } from '../api/problems'

function Problems() {
  const { searchQuery, updateSearchQuery } = useSearchQuery()
  const { problem: startProblemId } = searchQuery
  const [problemId, _setProblemId] = useState(startProblemId || 1)
  const setProblemId = (newProblemId) => {
    updateSearchQuery({ problem: newProblemId }, true)
    _setProblemId(newProblemId)
  }
  const [solutionId, setSolutionId] = useState(null)
  const { data: problems } = useProblems()
  const { data: _problem } = useProblem(problemId, { enabled: !!problemId })
  const problem = _problem && _.merge({}, _problem, {
    holeEdgeVerticePairs: _.map(_problem.hole, (h, idx) => [
      h,
      _problem.hole[(idx+1)%_problem.hole.length]
    ])
  })
  const { data: solutions, refetch: refetchSolutions } = useSolutions(problemId, { enabled: !!problemId, refreshInterval: 60000 })
  const { data: solution, refetch: refetchSolution } = useSolution(problemId, solutionId, { enabled: !!problemId && !!solutionId })
  const { data: stats } = useStats()
  const onSaveSolution = (problemId, username, solution, forSubmit=false) => {
    console.log('Saving solution', problemId, solution)
    return saveSolution(problemId, username, solution, forSubmit)
  }
  return (
    <div className='app'>
      <ScrollToTop/>
      <NavHeader/>
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
        <span className={styles.refreshLabel} onClick={() => { refetchSolutions(); refetchSolution(); }}>Refresh</span>
      </p>
      {stats && problem &&
        <ProblemViewer
          key={problemId}
          problemId={problemId}
          problem={problem}
          solution={solution}
          stats={stats[`${problemId}`]}
          onSaveSolution={onSaveSolution}
        />
      }
    </div>
  )
}

export default Problems
