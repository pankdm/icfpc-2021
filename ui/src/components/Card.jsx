import React from 'react'
import cs from 'classnames'
import styles from './Card.module.css'
import shadows from './shadows.module.css'

export default function Card({ className, level=1, ...props }) {
    return <div className={cs(styles.card, shadows[`shadow${level}`], className)} {...props} />
}
