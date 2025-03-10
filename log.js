export const addLog = (id, log) => {
    if (!id) return
    const logs = localStorage.getItem('signoff-log')
    if (!logs) {
        localStorage.setItem('signoff-log', JSON.stringify([{ [id]: log }]))
    } else {
        let _logs = []
        try {
            _logs = JSON.parse(logs)
        } catch (err) {

        }
        _logs.push({ [id]: log })
        localStorage.setItem('signoff-log', JSON.stringify(_logs))
    }
}