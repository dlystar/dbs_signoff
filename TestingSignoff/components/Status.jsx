import {Tag} from '@chaoswise/ui'
const status = {
    'WAITSEND': <Tag>Pending Action</Tag>,
    'PENDING': <Tag color="#427cff">Pending Signoff</Tag>,
    'APPROVED': <Tag color="#4dc400">Approved</Tag>,
    'REJECTED': <Tag color="#e90031">Rejected</Tag>
}
const Status = ({value}) => {
    return status[value] || null
}

export default Status