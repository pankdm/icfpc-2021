import React from 'react'
import NavHeader from '../NavHeader.jsx'
import styles from './Scores.module.css'

import { useProblem, useProblems, useProblemsAll, useStats } from '../api/problems'
import _ from 'lodash'


export default function Scores(props) {
  const { data: stats } = useStats()
  const { data: all_problems } = useProblemsAll()
  if (!all_problems) {
    return <div className={`app ${styles.app}`}></div>
  }
  console.log(all_problems)
  return (
    <div className={`app ${styles.app}`}>
      <NavHeader />
      <h1>Scores go here!</h1>
      <table>
        <tbody>
          <tr>
            <td> problem </td>
            <td> your dislikes</td>
            <td> minimal dislikes </td>
            <td> your score </td>
            <td> max score </td>
            <td> delta </td>
            <td> bonuses </td>
          </tr>
          {_.map(
            stats,
            (value, key) => {
              return <tr key={key}>
                <td> {key.toString()}</td>
                <td> {value['dislikes']}</td>
                <td> {value['min_dislikes']}</td>
                <td> {value['score']}</td>
                <td> {value['max_score']}</td>
                <td> {value['max_score'] - value['score']}</td>
                <td> {JSON.stringify(all_problems[key]['bonuses'])}</td>
              </tr>
            }
          )
          }
        </tbody>
      </table>
    </div>
  )
}
