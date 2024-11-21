import { useEffect, useShallowState } from "kaiku"
import { Source, pushError } from "../state"
import { SourceFetchOptions, sourceFetchBlob } from "./source"
import { deepEqual } from "./deep"

/*

type Waiter = {
    resolve: (blob: CachedBlob) => void
    reject: (err: any) => void
}

type IncompleteBlob = {
    key: string
    blob: Blob | null
    objectUrl: string | null
    refcount: number
    waiters: Waiter[] | undefined
}

export type CachedBlob = {
    key: string
    blob: Blob
    objectUrl: string
    refcount: number
}

let cache = new Map<string, IncompleteBlob>()

export async function sourceFetchBlobCached(source: Source, path: string, options?: SourceFetchOptions): Promise<CachedBlob> {
    const key = `${source.uuid}:${path}`
    const existing = cache.get(key)
    if (existing) {
        existing.refcount += 1
        if (existing.objectUrl !== null) {
            return existing as CachedBlob
        } else {
            return new Promise((resolve, reject) => {
                existing.waiters!.push({ resolve, reject })
            })
        }
    }

    const result: IncompleteBlob = {
        key,
        blob: null,
        objectUrl: null,
        refcount: 1,
        waiters: [],
    }
    cache.set(key, result)

    try {
        const blob = await sourceFetchBlob(source, path, options)
        const objectUrl = URL.createObjectURL(blob)

        result.blob = blob
        result.objectUrl = objectUrl

        const waiters = result.waiters!
        delete result.waiters

        for (const waiter of waiters) {
            waiter.resolve(result as CachedBlob)
        }
        return result as CachedBlob
    } catch (err) {
        for (const waiter of result.waiters!) {
            waiter.reject(err)
        }
        cache.delete(key)
        throw err
    }
}

export function freeCachedBlob(cachedBlob: CachedBlob) {
    cachedBlob.refcount -= 1
    if (cachedBlob.refcount === 0) {
        if (cachedBlob.objectUrl !== null) {
            URL.revokeObjectURL(cachedBlob.objectUrl)
            cache.delete(cachedBlob.key)
        }
    }
}

*/

type Future = {
    resolve: (blob: string) => void
    reject: (err: any) => void
}

type Refs = {
    key: string
    url: string
    count: number
}

let fetchFutures = new Map<string, Future[]>()
let keyRefcount = new Map<string, Refs>()
let urlRefcount = new Map<string, Refs>()

async function sourceFetchBlobUrlInternal(source: Source, path: string, options?: SourceFetchOptions): Promise<string> {
    const blob = await sourceFetchBlob(source, path, options)
    const url = URL.createObjectURL(blob)
    console.log(`createObjectURL(${source.uuid}:${path}) -> ${url}`)
    return url
}


export function sourceFetchBlobUrl(source: Source, path: string, options?: SourceFetchOptions): Promise<string> {
    const key = `${source.uuid}:${path}`
    const refs = keyRefcount.get(key)
    console.log(`sourceFetchBlobUrl(${key})`)
    if (refs) {
        refs.count += 1
        return Promise.resolve(refs.url)
    }

    return new Promise((resolve, reject) => {
        const future = { resolve, reject }

        const pending = fetchFutures.get(key)
        if (pending) {
            pending.push(future)
            return
        }

        const futures = [future]
        fetchFutures.set(key, futures)

        sourceFetchBlobUrlInternal(source, path, options)
            .then((url) => {
                const refs = { key, url, count: futures.length }
                keyRefcount.set(key, refs)
                urlRefcount.set(url, refs)
                fetchFutures.delete(key)

                for (const f of futures) {
                    f.resolve(url)
                }
            })
            .catch((err) => {
                fetchFutures.delete(key)
                for (const f of futures) {
                    f.reject(err)
                }
            })
    })
}

export async function sourceFreeBlobUrl(url: string) {
    const refs = urlRefcount.get(url)
    console.log(`sourceFreeBlobUrl(${url})`)
    if (!refs) return
    if (--refs.count == 0) {
        urlRefcount.delete(url)
        keyRefcount.delete(refs.key)
        URL.revokeObjectURL(url)
        console.log(`revokeObjectURL(${url})`)
    }
}

export function useSourceBlobUrl(source: Source, path: string, options?: SourceFetchOptions) {
    type State = {
        token: number
        source: Source | null
        path: string
        blobUrl: string
    }

    const state = useShallowState<State>({
        token: 0,
        source: null,
        path: "",
        blobUrl: "",
    })

    useEffect(() => () => {
        if (state.blobUrl) {
            state.token += 1
            sourceFreeBlobUrl(state.blobUrl)
            state.blobUrl = ""
        }
    })

    useEffect(() => {
        if (!deepEqual(source, state.source) || state.path !== path) {
            let token = ++state.token
            state.source = source
            state.path = path

            if (state.blobUrl) {
                sourceFreeBlobUrl(state.blobUrl)
                state.blobUrl = ""
            }

            sourceFetchBlobUrl(source, path, options)
                .then((url) => {
                    if (state.token === token) {
                        state.blobUrl = url
                    } else {
                        sourceFreeBlobUrl(url)
                    }
                })
                .catch((err) => {
                    pushError("Failed to fetch blob", err)
                })
        }
    })

    return state.blobUrl
}
