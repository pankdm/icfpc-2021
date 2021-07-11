import React from 'react'
import styles from './AspectRatioBox.module.css'
import cs from 'classnames'

export default function AspectRatioBox({ aspectRatio=1, className, ...props }) {
  return (
    <div className={cs(styles.box, className)} style={{ paddingTop: `calc(${1 / aspectRatio} * 100%)`}}>
      <div className={styles.inside} {...props} />
    </div>
  )
}
