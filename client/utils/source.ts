import { MangoError, Source } from "../state"

export async function sourceGetJson(src: Source, path: string) {
    const method = "GET"
    const finalPath = `${src.url}/${path}`

    let response: Response
    let json: any
    try {
        const headers: Record<string, string> = {
            "Accept": "application/json",
        }
        if (src.auth.type === "basic") {
            const auth = btoa(`${src.auth.username}:${src.auth.password}`)
            headers["Authorization"] = `Basic ${auth}`
        }
        response = await fetch(finalPath, { headers })
        json = await response.json()
    } catch (err) {
        throw new MangoError("fetch", `${method} ${finalPath}: ${err.message ?? ""}`)
    }

    if (response.status >= 300) {
        throw new MangoError("source", `${finalPath} returned ${response.status}`)
    }

    return json
}

export async function sourceGetBuffer(src: Source, path: string): Promise<ArrayBuffer> {
    const method = "GET"
    const finalPath = `${src.url}/${path}`

    let response: Response
    let buffer: ArrayBuffer
    try {
        const headers: Record<string, string> = { }
        if (src.auth.type === "basic") {
            const auth = btoa(`${src.auth.username}:${src.auth.password}`)
            headers["Authorization"] = `Basic ${auth}`
        }
        response = await fetch(finalPath, { headers })
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

export async function sourceGetBlob(src: Source, path: string): Promise<Blob> {
    const method = "GET"
    const finalPath = `${src.url}/${path}`

    let response: Response
    let blob: Blob
    try {
        const headers: Record<string, string> = { }
        if (src.auth.type === "basic") {
            const auth = btoa(`${src.auth.username}:${src.auth.password}`)
            headers["Authorization"] = `Basic ${auth}`
        }
        response = await fetch(finalPath, { headers })
        blob = await response.blob()
        console.log(method, finalPath, `${(blob.size/1e3).toFixed(2)}kB`)
    } catch (err) {
        throw new MangoError("fetch", `${method} ${finalPath}: ${err.message ?? ""}`)
    }

    if (response.status >= 300) {
        throw new MangoError("source", `${finalPath} returned ${response.status}`)
    }

    return blob
}


