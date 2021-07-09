import React from 'react'
import { Flex } from './Flex'

export default function Box({style, size='auto', width, height, color='#ccc', ...props}) {
    const finalWidth = width || size
    const finalHeight = height || size
    const finalStyle = {
        width: finalWidth,
        height: finalHeight,
        backgroundColor: color,
        borderRadius: 3,
        ...style
    }
    return <Flex alignItems='center' justifyContent='center' style={finalStyle} {...props} />
}
