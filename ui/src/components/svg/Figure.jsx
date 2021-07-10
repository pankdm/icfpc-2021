import React, { useRef } from 'react'
import _ from 'lodash'
import Line from './Line.jsx'
import Point from './Point.jsx'
import Group from './Group.jsx'
import Label from './Label.jsx'
import useDrag from '../../utils/useDrag.js'
import { hexColorLerp, hexColorLerpHSL } from '../../utils/utils.js'

const springConfig={
  tension: 450,
  friction: 45,
}

function FigurePoint({
  idx,
  x,
  y,
  pointColor,
  pointRadius=0.5,
  animate=false,
  springConfig,
  onDragStart=()=>{},
  onDragEnd=()=>{},
  onDrag=()=>{},
}) {
  const ref = useRef()
  useDrag(ref, [], {
    onDragStart,
    onDragEnd,
    onDrag,
  })
  return (
    <Group ref={ref} x={x} y={y} animate={animate} springConfig={springConfig}>
      <Point
        radius={pointRadius}
        color={pointColor}
        onDragStart={(ev) => onPointGrab(ev, idx)}
        onDragEnd={(ev) => onPointRelease(ev, idx)}
        onDrag={(ev) => onPointDrag(ev, idx, {clientX: ev.clientX, clientY: ev.clientY, dx: ev.movementX, dy: ev.movementY})}
      />
      <Label xOffset={0.5} yOffset={-0.5}>{idx}</Label>
    </Group>
  )
}

export default function Figure({
  vertices,
  edges,
  animate,
  frozenPoints,
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
            animate={animate}
            x1={x1}
            x2={x2}
            y1={y1}
            y2={y2}
            springConfig={springConfig}
            strokeDasharray={_.find([
              overstretchedEdges[idx] && "2,2",
              overshrinkedEdges[idx] && "0.15 0.75",
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
        const isFrozen = frozenPoints.has(idx)
        const _animate = isFrozen ? false : animate
        const pointColor = isFrozen ? '#fa0' : '#fff'
        return (
          <FigurePoint
            key={idx}
            idx={idx}
            x={x}
            y={y}
            pointColor={pointColor}
            animate={_animate}
            springConfig={springConfig}
            onDragStart={(ev) => {
              ev.stopPropagation()
              onPointGrab(ev, idx)
            }}
            onDrag={(ev) => onPointDrag(ev, idx)}
            onDragEnd={(ev) => onPointRelease(ev, idx)}
          />
        )
      })}
    </g>
  )
}
