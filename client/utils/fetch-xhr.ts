import { MangoError } from "../state"

export class CancelError extends Error { }

export class CancelToken {
    listeners: (() => void)[] = []
    constructor() { }

    listen(fn: () => void) {
        this.listeners.push(fn)
    }

    remove(fn: () => void) {
        const ix = this.listeners.indexOf(fn)
        if (ix !== null) {
            this.listeners.splice(ix)
        }
    }

    cancel() {
        for (const fn of this.listeners) {
            fn()
        }
        this.listeners = []
    }
}

export type FetchXHROpts = {
    progress?: (progress: { amount: number, total: number}) => void,
    method?: string
    responseType?: XMLHttpRequestResponseType
    cancel?: CancelToken
}

export function fetchXHR(url: string, opts: FetchXHROpts): Promise<any> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.responseType = opts.responseType ?? "arraybuffer"
        if (opts.progress) {
            xhr.addEventListener("progress", e => opts.progress!({ amount: e.loaded, total: e.total }))
        }
        const cancelFn = () => xhr.abort()
        const cancelToken = opts.cancel
        const cleanup = () => {
            if (cancelToken) {
                cancelToken.remove(cancelFn)
            }
        }
        if (cancelToken) {
            cancelToken.listen(cancelFn)
        }

        const method = opts.method ?? "GET"

        xhr.addEventListener("abort", e => { cleanup(); reject(new CancelError()) })
        xhr.addEventListener("error", e => { cleanup(); reject(new MangoError("fetch", "XHR error")) })
        xhr.addEventListener("load", e => {
            cleanup()
            if (xhr.status === 200) {
                resolve(xhr.response)
            } else {
                reject(new MangoError("source", `${method} ${url} returned ${xhr.status}`))
            }
        })

        xhr.open(opts.method ?? "GET", url)
        xhr.send()
    })
}
