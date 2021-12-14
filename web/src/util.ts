// Credit to https://stackoverflow.com/a/6041965/7371580
let linkMatcher = /((http|ftp|https):\/\/)?([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@^=%&\/~+#-])/
let userMatcher = /@[a-zA-Z0-9\.]+/

export function splitByLink(message: string) {
    let parts = []

    do {
        let link = linkMatcher.exec(message)
        let user = userMatcher.exec(message)
        
        
        if (!link && !user) {
            parts.push({ text: message.slice(), type: "text" })
            message = ""
        } else {
            let isLink = (link && !user) || (user && link && link.index < user.index)
            let type = isLink ? "link" : "user"
            let part = isLink ? link![0] : user![0]
            let index = isLink ? link!.index : user!.index
    
            if (index > 0) {
                parts.push({ text: message.substr(0, index).slice(), type: "text"})
                message = message.substr(index)
            }
    
            parts.push({ text: part.slice(), type: type})
            message = message.substr(part.length)
        }
    } while (message.length > 0)

    return parts
}

export function addHttp(link: string) {
    if (!link.startsWith("http")) {
        link = "https://" + link
    }
    return link
}