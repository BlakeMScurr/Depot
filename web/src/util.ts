import * as ethers from "ethers"

// Credit to https://stackoverflow.com/a/6041965/7371580
let linkMatcher = /((http|ftp|https):\/\/)?([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@^=%&\/~+#-])/
let userMatcher = /@[a-zA-Z0-9\.]+/

export function splitByLink(message: string):Array<{text: string, type: string}> {
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

// Underlying messages are represented as felts (field elements) as defined in cairo (https://www.cairo-lang.org/docs/hello_cairo/intro.html?highlight=felt#field-element)
// A felt is a 252 bit integer, which fits 31 bytes
// The first felt is "length" which describes how many felts are required to encode the message. This enables arbitrary length messages.
export function feltToString(message: Array<ethers.BigNumber>):string {
    let result = ""
    for (let i = 1; i < message.length; i++) {
        result += ethers.utils.toUtf8String(ethers.utils.arrayify(message[i]))
    }
    return result
}

export function stringToFelt(rendered: string):Array<ethers.BigNumber> {
  let bytes = ethers.utils.toUtf8Bytes(rendered)
  let felts = []
  for (let i = 0; i < bytes.length; i += 31) {
    felts.push(ethers.BigNumber.from(bytes.slice(i, i + 31)))
  }
  felts.unshift(ethers.BigNumber.from(felts.length))
  return felts
}