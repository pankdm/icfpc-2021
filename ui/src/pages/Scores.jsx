import React from 'react'
import NavHeader from '../NavHeader.jsx'

import { useStats } from '../api/problems'
import _ from 'lodash'


export default function Scores(props) {
  const {data: stats } = useStats()
  console.log(stats)
  return (
    <div className='app'>
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
      </tr>
      {_.map(
              stats,
              (value, key) => 
              <tr>
                <td> {key.toString()}</td>
                <td> {value['dislikes']}</td>
                <td> {value['min_dislikes']}</td>
                <td> {value['score']}</td>
                <td> {value['max_score']}</td>
                <td> {value['max_score'] - value['score']}</td>
              </tr>
            )
      }
      </tbody>
      </table>
    </div>
  )
}
