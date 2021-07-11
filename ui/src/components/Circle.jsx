import React from 'react'
import { Flex } from './Flex'

export default function Circle({style, size='auto', color='#ccc', ...props}) {
    const finalWidth = size
    const finalHeight = size
    const finalStyle = {
        width: finalWidth,
        height: finalHeight,
        backgroundColor: color,
        borderRadius: '50%',
        ...style
    }
    return <Flex alignItems='center' justifyContent='center' style={finalStyle} {...props} />
}
