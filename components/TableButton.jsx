import React, { useState } from "react";
import { Button } from '@chaoswise/ui'
export default (props) => {
    const [loading, setLoading] = useState(false)
    const handleClick = (e) => {
        if (props.onClick) {
            const clickFn = props.onClick
            const btnRes = clickFn(e)
            if (btnRes instanceof Promise) {
                setLoading(true)
                btnRes.finally(() => {
                    setLoading(false)
                })
            }
        }
    }
    return <Button {...props} loading={loading} onClick={handleClick}>{props.children}</Button>
}