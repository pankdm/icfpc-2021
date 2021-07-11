import React, { useState } from 'react'
import _ from 'lodash'
import Flex from '../components/Flex.jsx'
import NavHeader from '../NavHeader.jsx'
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

export default function Scores(props) {
  const { data: stats } = useStats()
  const { data: all_problems } = useProblemsAll()
  const [sort, setSort] = useState(null)
  const [sortOrder, setSortOrder] = useState(null)
  if (!all_problems) {
    return <div className={`app ${styles.app}`}></div>
  }
  const getSortOrder = (key) => sort == key ? sortOrder : null
  const toggleSort = (newSort, defSortOrder='asc') => {
    if (newSort != sort) {
      setSort(newSort)
      setSortOrder(defSortOrder)
    } else {
      if (sortOrder == defSortOrder) {
        setSortOrder(defSortOrder == 'asc' ? 'desc' : 'asc')
      } else {
        setSort(null)
        setSortOrder(null)
      }
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
            <Th sortOrder={getSortOrder('dislikes')} onClick={() => toggleSort('dislikes', 'desc')}> your dislikes</Th>
            <Th sortOrder={getSortOrder('min_dislikes')} onClick={() => toggleSort('min_dislikes', 'desc')}> minimal dislikes </Th>
            <Th sortOrder={getSortOrder('score')} onClick={() => toggleSort('score', 'desc')}> your score </Th>
            <Th sortOrder={getSortOrder('max_score')} onClick={() => toggleSort('max_score', 'desc')}> max score </Th>
            <Th sortOrder={getSortOrder('delta')} onClick={() => toggleSort('delta', 'desc')}> delta </Th>
            <th> bonuses </th>
          </tr>
          {_.map(
            sortedStats,
            (value) => {
              const id = value['id']
              return <tr key={id}>
                <td><a href={`http://poses.live/problems/${id}`}><div className={styles.idCell}>{id}</div></a></td>
                <td> {value['dislikes']}</td>
                <td> {value['min_dislikes']}</td>
                <td> {value['score']}</td>
                <td> {value['max_score']}</td>
                <td> {value['delta']}</td>
                <td>
                  {_.map(all_problems[value['id']]['bonuses'], (b, bidx) => (
                    <pre key={value['id']+'bonus'+bidx}>
                      {(b.bonus + ':').padEnd(13, ' ')} #{b.problem.toString().padEnd(4)} ({b.position[0]},{b.position[1]})
                      <br/>
                    </pre>
                  ))}
                </td>
              </tr>
            }
          )
          }
        </tbody>
      </table>
    </div>
  )
}
