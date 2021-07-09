import React from 'react'
import cs from 'classnames'
import styles from './Flex.module.css'

export function Flex({
    className,
    style,
    direction='horizontal',
    alignItems='center',
    justifyItems=null,
    alignContent=null,
    justifyContent=null,
    wrap=null,
    ...props
}) {
    const finalStyle = {
        flexDirection: direction,
        flexWrap: wrap,
        alignItems,
        alignContent,
        justifyItems,
        justifyContent,
        ...style,
    }
    return <div className={cs(styles.flex, className)} style={finalStyle} {...props} />
}

export function FlexItem({
    className,
    style,
    basis=null,
    grow=1,
    shrink=1,
    alignSelf=null,
    justifySelf=null,
    ...props
}) {
    const finalStyle = {
        ...style,
        flexBasis: basis,
        flexGrow: grow,
        flexShrink: shrink,
        alignSelf,
        justifySelf,
    }
    return <div className={cs(styles.flexItem, className)} style={finalStyle} {...props} />
}

export default Flex
