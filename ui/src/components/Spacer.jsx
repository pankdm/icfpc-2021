import React from 'react'
import cs from 'classnames'
import styles from './Spacer.module.css'

export default function Spacer({size='md', className, ...props}) {
    return <div className={cs(styles.spacer, styles[`spacer-${size}`], className)} {...props} />
}
