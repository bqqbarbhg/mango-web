import { MangoError, Source } from "../state"

type SourceFetchOptions = {
    method?: string,
    headers?: Record<string, string>
}

export async function sourceFetch(src: Source, path: string, options?: SourceFetchOptions): Promise<Response> {
    const method = options?.method ?? "GET"
    const url = `${src.url}/${path}`

    let response: Response
    try {
        const headers: Record<string, string> = { ...options?.headers }
        if (src.auth.type === "basic") {
            const auth = btoa(`${src.auth.username}:${src.auth.password}`)
            headers["Authorization"] = `Basic ${auth}`
        }
        response = await fetch(url, { method, headers })
    } catch (err) {
        throw new MangoError("fetch", `${method} ${url}: ${err.message ?? ""}`)
    }

    if (response.status >= 300) {
        throw new MangoError("source", `${url} returned ${response.status}`)
    }

    return response
}

export async function sourceFetchJson(src: Source, path: string, options?: SourceFetchOptions): Promise<any> {
    const headers = {
        "Accept": "application/json",
        ...options?.headers,
    }
    const response = await sourceFetch(src, path, { ...options, headers })
    return response.json()
}

export async function sourceFetchBuffer(src: Source, path: string, options?: SourceFetchOptions): Promise<ArrayBuffer> {
    const response = await sourceFetch(src, path, options)
    return response.arrayBuffer()
}

export async function sourceFetchBlob(src: Source, path: string, options?: SourceFetchOptions): Promise<Blob> {
    const response = await sourceFetch(src, path, options)
    return response.blob()
}


