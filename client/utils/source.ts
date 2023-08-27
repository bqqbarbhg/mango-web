import { MangoError, Source } from "../state"

export type SourceFetchOptions = {
    method?: string
    headers?: Record<string, string>
    cache?: boolean
    etag?: string | null
}

let cacheDbRequest: IDBOpenDBRequest | null = null
let cacheDb: IDBDatabase | null = null

function initCache(): Promise<IDBDatabase> {
    if (cacheDb) return Promise.resolve(cacheDb)
    return new Promise((resolve, reject) => {
        let request = cacheDbRequest

        if (!request) {
            request = indexedDB.open("source-cache", 1)
            cacheDbRequest = request

            request.addEventListener("upgradeneeded", (e: IDBVersionChangeEvent) => {
                const db = (e.target as any).result as IDBDatabase

                db.createObjectStore("data", {
                    keyPath: "key",
                })
                db.createObjectStore("etag", {
                    keyPath: "key",
                })
            })

            request.addEventListener("success", () => {
                cacheDb = request!.result
                cacheDbRequest = null
            })

            request.addEventListener("error", () => {
                cacheDbRequest = null
            })
        }

        if (request) {
            request.addEventListener("success", () => {
                resolve(request!.result)
            })
            request.addEventListener("error", () => {
                reject(request!.error)
            })
        }
    })
}

type EtagEntry = {
    key: string
    etag: string
}

function getCachedEtag(db: IDBDatabase, key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
        const req = db
            .transaction("etag", "readonly")
            .objectStore("etag")
            .get(key)
        
        req.onsuccess = () => resolve(req.result?.etag ?? null)
        req.onerror = () => reject(req.error)
    })
}

function getCachedData(db: IDBDatabase, key: string): Promise<any | null> {
    return new Promise((resolve, reject) => {
        const req = db
            .transaction("data", "readonly")
            .objectStore("data")
            .get(key)
        
        req.onsuccess = () => resolve(req.result?.data ?? null)
        req.onerror = () => reject(req.error)
    })
}

async function storeCache(db: IDBDatabase, key: string, etag: string, data: any): Promise<void> {
    const etagPromise = new Promise((resolve, reject) => {
        const req = db
            .transaction("etag", "readwrite")
            .objectStore("etag")
            .put({ key, etag })
        
        req.onsuccess = () => resolve(undefined)
        req.onerror = () => reject()
    })

    const dataPromise = new Promise((resolve, reject) => {
        const req = db
            .transaction("data", "readwrite")
            .objectStore("data")
            .put({ key, data })
        
        req.onsuccess = () => resolve(undefined)
        req.onerror = () => reject()
    })

    await Promise.all([etagPromise, dataPromise])
}

export function sourceFetch(src: Source, path: string, options?: SourceFetchOptions): Promise<Response>
export function sourceFetch<T>(src: Source, path: string, options: SourceFetchOptions | undefined, transform: (r: Request) => Promise<T>): Promise<T>
export async function sourceFetch<T>(src: Source, path: string, options?: SourceFetchOptions, transform?: (r: Request) => Promise<T>) {
    const method = options?.method ?? "GET"
    const url = `${src.url}/${path}`
    const key = `${src.uuid}:${path}`

    const cache = options?.cache ? (await initCache()) : null

    let etag: string | null = null
    if (cache) {
        etag = await getCachedEtag(cache, key)
    }

    let response: Response
    try {
        const headers: Record<string, string> = { ...options?.headers }
        if (src.auth.type === "basic") {
            const auth = btoa(`${src.auth.username}:${src.auth.password}`)
            headers["Authorization"] = `Basic ${auth}`
            if (etag) {
                headers["If-None-Match"] = etag
            }
        }
        response = await fetch(url, { method, headers })
    } catch (err) {
        throw new MangoError("fetch", `${method} ${url}: ${err.message ?? ""}`)
    }

    let value: any = response
    if (transform && response.status < 300) {
        value = await transform(value)
    }

    if (cache && response.status === 304) {
        const value = await getCachedData(cache, key)
        return value
    } else if (cache && response.status === 200) {
        const etag = response.headers.get("Etag")
        if (etag) {
            await storeCache(cache, key, etag, value)
        }
    }

    if (response.status >= 300) {
        throw new MangoError("source", `${url} returned ${response.status}`)
    }

    return value
}

export async function sourceFetchJson(src: Source, path: string, options?: SourceFetchOptions): Promise<any> {
    const headers = {
        "Accept": "application/json",
        ...options?.headers,
    }

    return sourceFetch(src, path, { ...options, headers },
        r => r.json())
}

export async function sourceFetchBuffer(src: Source, path: string, options?: SourceFetchOptions): Promise<ArrayBuffer> {
    return sourceFetch(src, path, options,
        r => r.arrayBuffer())
}

export async function sourceFetchBlob(src: Source, path: string, options?: SourceFetchOptions): Promise<Blob> {
    return sourceFetch(src, path, options,
        r => r.blob())
}
