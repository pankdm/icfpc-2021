import React from 'react'
import _ from 'lodash'
import Line from './Line.jsx'
import Point from './Point.jsx'
import Group from './Group.jsx'
import Label from './Label.jsx'
import { hexColorLerp, hexColorLerpHSL } from '../../utils/utils.js'
import * as utils from '../../utils/utils.js'
window.UTILS = utils
const springConfig={
  tension: 250,
  friction: 15,
}

export default function Figure({
  vertices,
  edges,
  epsilon,
  edgeStretches,
  overstretchedEdges,
  overshrinkedEdges,
  pointColor='#fff',
  pointRadius=0.5,
  lineColor='#ff0000',
  overstretchedColor='#ffccaa',
  overshrinkedColor='#880000',
  lineWidth=0.5,
  stretchedLines=null,
  shrinkedLines=null,
  stretchColor='gold',
  shrinkColor='orange',
  onPointGrab=()=>{},
  onPointRelease=()=>{},
  onPointDrag=()=>{},
  ...props
}) {
  return (
    <g id='figure' {...props}>
      {edges.map(([start, end], idx) => {
        const [x1, y1] = vertices[start]
        const [x2, y2] = vertices[end]
        const color = _.find([
          overstretchedColor && epsilon > 0 && edgeStretches[idx] > 1 && hexColorLerp(lineColor, overstretchedColor, (edgeStretches[idx]-1)/epsilon),
          overshrinkedColor && epsilon > 0 && edgeStretches[idx] < 1 && hexColorLerp(lineColor, overshrinkedColor, (1-edgeStretches[idx])/epsilon),
          overstretchedEdges[idx] && overstretchedColor,
          overshrinkedEdges[idx] && overshrinkedColor,
          lineColor,
        ])
        return (
          <Line
            key={idx}
            animate={true}
            x1={x1}
            x2={x2}
            y1={y1}
            y2={y2}
            springConfig={springConfig}
            strokeDasharray={_.find([
              overstretchedEdges[idx] && "2,2",
              overshrinkedEdges[idx] && "0.75,0.75",
              null
            ])}
            stroke={color}
            strokeWidth={lineWidth}
            strokeLinecap='round'
            {...props}
          />
        )
      })}
      {vertices.map(([x, y], idx) => {
        return (
          <Group key={idx} x={x} y={y} animate={true} springConfig={springConfig}>
            <Point
              radius={0.5}
              color={pointColor}
              onDragStart={(ev) => onPointGrab(ev, idx)}
              onDragEnd={(ev) => onPointRelease(ev, idx)}
              onDrag={(ev) => onPointDrag(ev, idx, {clientX: ev.clientX, clientY: ev.clientY, dx: ev.movementX, dy: ev.movementY})}
            />
            <Label xOffset={0.5} yOffset={-0.5}>{idx}</Label>
          </Group>
        )
      })}
    </g>
  )
}
