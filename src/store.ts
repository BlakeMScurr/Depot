export type request = {
    rq: { type: number, blocknumber: number,  sender: string, signature: string, message: string }, 
    metadata: { hash: string, root: number, branches: Array<{left: boolean, value: number}> }
}

export async function fetchMessages() {
    let response = await fetch("/api/messages")
    let data = await response.text()
    let parsed = JSON.parse(data)
    if (!parsed) {
        return []
    }
    return parsed
}

export function getUser(user: string) {
    return async () => {
        let url = `/api/user?user=${user}`
        let response = await fetch(url)
        let data = await response.text()
        let parsed = JSON.parse(data)
        return parsed
    }
}

export function getMessage(hash: string) {
    return async () => {
        let url = `/api/message?hash=${hash}`
        let response = await fetch(url)
        let data = await response.text()
        let parsed = JSON.parse(data)
        return parsed
    }
}

export async function setMessage(rq: request) {
    let response = await fetch("/api/message", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(rq),
    })
}