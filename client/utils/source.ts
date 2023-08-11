import { MangoError, SourceInfo } from "../state"

export async function sourceGetJson(src: SourceInfo, path: string) {
    const method = "GET"
    const finalPath = `${src.url}/${path}`

    let response: Response
    let json: any
    try {
        response = await fetch(finalPath, {
            headers: {
                "Accept": "application/json",
            }
        })
        json = await response.json()
    } catch (err) {
        throw new MangoError("fetch", `${method} ${finalPath}: ${err.message ?? ""}`)
    }

    if (response.status >= 300) {
        throw new MangoError("source", `${finalPath} returned ${response.status}`)
    }

    return json
}

export async function sourceGetBuffer(src: SourceInfo, path: string): Promise<ArrayBuffer> {
    const method = "GET"
    const finalPath = `${src.url}/${path}`

    let response: Response
    let buffer: ArrayBuffer
    try {
        response = await fetch(finalPath)
        buffer = await response.arrayBuffer()
        console.log(method, finalPath, `${(buffer.byteLength/1e3).toFixed(2)}kB`)
    } catch (err) {
        throw new MangoError("fetch", `${method} ${finalPath}: ${err.message ?? ""}`)
    }

    if (response.status >= 300) {
        throw new MangoError("source", `${finalPath} returned ${response.status}`)
    }

    return buffer
}
