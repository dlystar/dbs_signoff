import {Tag} from '@chaoswise/ui'
import {useRef, useEffect} from 'react'
const status = {
    'WAITSEND': <Tag>Pending Action</Tag>,
    'PENDING': <Tag color="#427cff">Pending Signoff</Tag>,
    'APPROVED': <Tag color="#4dc400">Approved</Tag>,
    'REJECTED': <Tag color="#e90031">Rejected</Tag>
}
const Status = ({value, showError, errorText, showStatus = true, signOffType}) => {
    const errorRef = useRef()
    const initRef = useRef(false)
    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            for(let entry of entries){
                const height = entry.contentRect.height
                errorRef.current.style.top = (height - 20) + 'px'
                errorRef.current.style.marginTop = 0 + 'px'
            }
        })
        const td = errorRef?.current?.parentNode?.parentNode?.parentNode?.parentNode?.parentNode?.parentNode?.parentNode
        if(signOffType && td){
            observer.observe(td)
        }
        return () => {
            signOffType && td && observer.unobserve(td)
        }
    },[])
    return <div>
        {showStatus && <div>{status[value] || null}</div>}
        {showError && <div ref={errorRef} style={{position: 'absolute', width: 300, marginTop: showStatus ? 10 : 20, color: 'red'}}>{errorText}</div>}
    </div>
}

export default Status
