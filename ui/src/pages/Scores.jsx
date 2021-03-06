import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import _ from 'lodash'
import Spacer from '../components/Spacer.jsx'
import Flex, { FlexItem } from '../components/Flex.jsx'
import ProblemPreview from '../components/ProblemPreview.jsx'
import NavHeader from '../NavHeader.jsx'
import useOnScreen from '../utils/useOnScreen.js'
import styles from './Scores.module.css'

import { useProblem, useProblems, useProblemsAll, useStats } from '../api/problems'

function Th({ sortOrder, children, ...props }) {
  return (
    <th>
      <Flex alignItems='flex-end'>
        <span className={styles.columnLabel} {...props}>{children}</span>
        <span className={styles.sortIcon}>
          {sortOrder == 'asc' && '↑'}
          {sortOrder == 'desc' && '↓'}
          {!_.includes(['asc', 'desc'], sortOrder) && ' '}
        </span>
      </Flex>
    </th>
  )
}

function StatsRow({ problemId, problem, stat, fromBonuses, ...props }) {
  const ref = useRef()
  const visible = useOnScreen(ref, { margin: 1000 })
  return (
    <tr>
      <td className={styles.idCell}>
        <Flex className={styles.idCellContent}>
          <Link to={`/?problem=${problemId}`}>
          <div ref={ref} style={{ width: '5em', height: '5em' }}>
            {visible && <ProblemPreview problem={problem} />}
          </div>
          </Link>
          <Spacer size='xs' />
          <Flex basis={'3em'} grow={0}>
            <a target='_blank' href={`http://poses.live/problems/${problemId}`}>
              {problemId}
            </a>
          </Flex>
        </Flex>
      </td>
      {/* <td> {stat['dislikes'] == stat['min_dislikes'] ? '✅ ': ''}</td> */}
      <td> {stat['dislikes']}</td>
      <td> {stat['dislikes'] == stat['min_dislikes_contest'] ? '✅ ': ''} {stat['min_dislikes_contest']}</td>
      <td> {stat['dislikes'] == stat['min_dislikes'] ? '✅ ': ''} {stat['min_dislikes']}</td>
      <td> {stat['score']}</td>
      <td> {stat['max_score']}</td>
      <td> {stat['delta']}</td>
      <td>
        {_.map(problem['bonuses'], (b, bidx) => (
          <pre key={stat['id']+'bonus'+bidx}>
            {(b.bonus + ':').padEnd(13, ' ')} #{b.problem.toString().padEnd(4)} ({b.position[0]},{b.position[1]})
            <br/>
          </pre>
        ))}
      </td>
      <td>
        {_.map(fromBonuses, (b, from_idx) => (
          <pre key={stat['id']+'bonus_from'+from_idx}>
            {(b + '').padEnd(13, ' ')}  {'from'} #{from_idx}
          <br/>
        </pre>
        ))}
      </td>
    </tr>
  )
}

export default function Scores(props) {
  const { data: stats } = useStats()
  const { data: all_problems } = useProblemsAll()
  const [sort, setSort] = useState('id')
  const [sortOrder, setSortOrder] = useState('asc')
  if (!all_problems) {
    return <div className={`app ${styles.app}`}></div>
  }
  let from_bonuses = {}
  _.map(all_problems, (value, idx) => {
    _.map(value['bonuses'], (bonus) => {
      from_bonuses[bonus['problem']] = from_bonuses[bonus['problem']] || {}
      from_bonuses[bonus['problem']][idx] = bonus['bonus']
    })
  })

  const getSortOrder = (key) => sort == key ? sortOrder : null
  const toggleSort = (newSort, defSortOrder='asc') => {
    if (newSort != sort) {
      setSort(newSort)
      setSortOrder(defSortOrder)
    } else {
      setSortOrder(sortOrder == 'asc' ? 'desc' : 'asc')
    }
  }
  const richStats = _.mapValues(stats, (value, key) => {
    // let richValue = _.mapValues(value, v => _.isNil(v) ? -1 : v)
    let richValue = {
      ...value,
      id: parseInt(key),
      dislikes: value['dislikes'] === undefined ? -1 : value['dislikes'],
      delta: value['max_score'] - value['score'],
    }
    return richValue
  })
  const sortedStats = _.orderBy(_.values(richStats), [sort], [sortOrder])
  return (
    <div className={`app ${styles.app}`}>
      <NavHeader />
      <h1>Scores go here!</h1>
      <table className={styles.table}>
        <tbody>
          <tr>
            <Th sortOrder={getSortOrder('id')} onClick={() => toggleSort('id', 'asc')}> problem </Th>
            {/* <Th> best? </Th> */}
            <Th sortOrder={getSortOrder('dislikes')} onClick={() => toggleSort('dislikes', 'desc')}> your dislikes</Th>
            <Th sortOrder={getSortOrder('min_dislikes_contest')} onClick={() => toggleSort('min_dislikes_contest', 'desc')}> minimal (contest) </Th>
            <Th sortOrder={getSortOrder('min_dislikes')} onClick={() => toggleSort('min_dislikes', 'desc')}> minimal </Th>
            <Th sortOrder={getSortOrder('score')} onClick={() => toggleSort('score', 'desc')}> your score </Th>
            <Th sortOrder={getSortOrder('max_score')} onClick={() => toggleSort('max_score', 'desc')}> max score </Th>
            <Th sortOrder={getSortOrder('delta')} onClick={() => toggleSort('delta', 'desc')}> delta </Th>
            <th> bonuses to get</th>
            <th> bonuses to use </th>
          </tr>
          {_.map(
            sortedStats,
            (stat, rowIdx) => (
              <StatsRow
                key={stat['id']}
                stat={stat}
                problemId={stat['id']}
                problem={all_problems[stat['id']]}
                fromBonuses={from_bonuses[stat['id']]}
              />
            )
          )
          }
        </tbody>
      </table>
    </div>
  )
}
