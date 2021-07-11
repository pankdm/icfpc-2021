import React from 'react'
import cs from 'classnames'
import AspectRatioBox from './AspectRatioBox.jsx'
import Circle from './Circle.jsx'
import Flex from './Flex.jsx'
import pngAsset from '../../static/traffic_light.png'
import styles from './TrafficLight.module.css'

export default function TrafficLight({ size='4em', red=true, yellow=false, green=false }) {
  return (
    <Flex direction='column' justifyContent='flex-start' className={styles.bg} style={{ '--traffic-light-size': size, backgroundImage: `url(${pngAsset})`  }}>
      <Circle size={null} className={cs(styles.light, styles.red, red && styles.active)} color={red ? 'red' : 'rgb(0,0,0,0.5)'} />
      <Circle size={null} className={cs(styles.light, styles.yellow, yellow && styles.active)} color={yellow ? 'yellow' : 'rgb(0,0,0,0.5)'} />
      <Circle size={null} className={cs(styles.light, styles.green, green && styles.active)} color={green ? 'lime' : 'rgb(0,0,0,0.5)'} />
    </Flex>
  )
}
