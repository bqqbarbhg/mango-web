import { MangoError, Source } from "../state"

export type SourceFetchOptions = {
    method?: string
    headers?: Record<string, string>
    cache?: boolean
    ttl?: number
    etag?: string | null
}

let cacheDbRequest: IDBOpenDBRequest | null = null
let cacheDb: IDBDatabase | null = null
let cacheLoaded: boolean = false

function initCache(): Promise<IDBDatabase | null> {
    if (cacheLoaded) return Promise.resolve(cacheDb)
    return new Promise((resolve, reject) => {
        let request = cacheDbRequest

        if (!request) {
            request = indexedDB.open("source-cache", 1)
            cacheDbRequest = request

            request.addEventListener("upgradeneeded", (e: IDBVersionChangeEvent) => {
                const db = (e.target as any).result as IDBDatabase

                db.createObjectStore("cache", { keyPath: "key" })
                db.createObjectStore("freshTime", { keyPath: "key" })
            })

            request.addEventListener("success", () => {
                cacheDb = request!.result
                cacheDbRequest = null
                cacheLoaded = true
            })

            request.addEventListener("error", () => {
                cacheDbRequest = null
                cacheLoaded = true
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

type CacheEntry = {
    key: string
    etag: string
    data: any
}

function getCacheEntry(db: IDBDatabase, key: string): Promise<CacheEntry | null> {
    return new Promise((resolve, reject) => {
        const req = db
            .transaction("cache", "readonly")
            .objectStore("cache")
            .get(key)
        
        req.onsuccess = () => resolve(req.result ?? null)
        req.onerror = () => reject(req.error)
    })
}

async function deleteCacheEntry(db: IDBDatabase, key: string): Promise<void> {
    const deletePromise = new Promise((resolve, reject) => {
        const req = db
            .transaction("cache", "readwrite")
            .objectStore("cache")
            .delete(key)
        
        req.onsuccess = () => resolve(undefined)
        req.onerror = () => reject()
    })

    await deletePromise
}

async function storeCacheEntry(db: IDBDatabase, key: string, etag: string, data: any): Promise<boolean> {
    const storePromise = new Promise((resolve, reject) => {
        const req = db
            .transaction("cache", "readwrite")
            .objectStore("cache")
            .put({ key, etag, data })
        
        req.onsuccess = () => resolve(undefined)
        req.onerror = () => reject()
    })

    try {
        await storePromise
        return true
    } catch (err) {
        console.error("Failed to store source cache entry", err)
        try {
            await deleteCacheEntry(db, key)
        } catch (err) {
            console.error("Failed to delete cache entry after failure", err)
        }
        return false
    }
}

function getCacheFreshTime(db: IDBDatabase, key: string): Promise<number | null> {
    return new Promise((resolve, reject) => {
        const req = db
            .transaction("freshTime", "readonly")
            .objectStore("freshTime")
            .get(key)
        
        req.onsuccess = () => resolve(req.result.time ?? null)
        req.onerror = () => reject(req.error)
    })
}

async function updateCacheFreshTime(db: IDBDatabase, key: string): Promise<void> {
    const time = Date.now()
    try {
        await new Promise((resolve, reject) => {
            const req = db
                .transaction("freshTime", "readwrite")
                .objectStore("freshTime")
                .put({ key, time })
            
            req.onsuccess = () => resolve(undefined)
            req.onerror = () => reject()
        })
    } catch (err) {
        console.error("Failed to update source cache fresh time", err)
    }
}

export function sourceFetch(src: Source, path: string, options?: SourceFetchOptions): Promise<Response>
export function sourceFetch<T>(src: Source, path: string, options: SourceFetchOptions | undefined, transform: (r: Request) => Promise<T>): Promise<T>
export async function sourceFetch<T>(src: Source, path: string, options?: SourceFetchOptions, transform?: (r: Request) => Promise<T>) {
    const method = options?.method ?? "GET"
    const url = `${src.url}/${path}`
    const key = `${src.uuid}:${path}`

    let cache: IDBDatabase | null = null
    if (options?.cache) {
        try {
            cache = await initCache()
        } catch (err) {
            console.error("Failed to initialize source cache", err)
        }
    }

    let cacheEntry: CacheEntry | null = null
    if (cache) {
        try {
            cacheEntry = await getCacheEntry(cache, key)
            const ttl = options?.ttl ?? null
            if (cacheEntry && ttl !== null) {
                const freshTime = await getCacheFreshTime(cache, key)
                if (freshTime !== null && freshTime >= Date.now() - ttl) {
                    return cacheEntry.data
                }
            }
        } catch (err) {
            console.error("Failed to fetch source cache entry", err)
        }
    }

    const headers: Record<string, string> = { ...options?.headers }
    if (src.auth.type === "basic") {
        const auth = btoa(`${src.auth.username}:${src.auth.password}`)
        headers["Authorization"] = `Basic ${auth}`
        if (cacheEntry) {
            headers["If-None-Match"] = cacheEntry.etag
        }
    }

    let response: Response
    try {
        response = await fetch(url, { method, headers })
    } catch (err) {
        throw new MangoError("fetch", `${method} ${url}: ${err.message ?? ""}`)
    }

    let value: any = response
    if (transform && response.status < 300) {
        value = await transform(value)
    }

    if (cacheEntry && response.status === 304) {
        await updateCacheFreshTime(cache!, key)
        return cacheEntry.data
    } else if (cache && response.status === 200) {
        const etag = response.headers.get("Etag")
        if (etag) {
            const ok = await storeCacheEntry(cache, key, etag, value)
            if (ok) {
                await updateCacheFreshTime(cache, key)
            }
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

    return sourceFetch(src, path, { ...options, headers }, r => r.json())
}

export async function sourceFetchBuffer(src: Source, path: string, options?: SourceFetchOptions): Promise<ArrayBuffer> {
    return sourceFetch(src, path, options, r => r.arrayBuffer())
}

export async function sourceFetchBlob(src: Source, path: string, options?: SourceFetchOptions): Promise<Blob> {
    return sourceFetch(src, path, options, r => r.blob())
}
