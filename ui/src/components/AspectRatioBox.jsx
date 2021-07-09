import React from 'react'
import styles from './AspectRatioBox.module.css'

export default function AspectRatioBox({ aspectRatio=1, ...props }) {
  return (
    <div className={styles.box} style={{ paddingTop: `calc(${1 / aspectRatio} * 100%)`}}>
      <div className={styles.inside} {...props} />
    </div>
  )
}
