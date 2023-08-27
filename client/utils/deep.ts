import { unwrap } from "kaiku"

export function deepEqual(a: any, b: any) {
    if (a === b) return true
    const type = typeof a
    if (type !== typeof b) return false
    if (type === "object") {
        if (a === null) return b === null
        if (b === null) return false
        if (Array.isArray(a)) {
            if (!Array.isArray(b)) return false
            const len = a.length
            if (len != b.length) return false
            for (let i = 0; i < a.length; i++) {
                if (!deepEqual(a[i], b[i])) return false
            }
            return true
        } else {
            for (const key of Object.keys(a)) {
                if (!b.hasOwnProperty(key)) return false
                if (!deepEqual(a[key], b[key])) return false
            }
            for (const key of Object.keys(b)) {
                if (!a.hasOwnProperty(key)) return false
            }
            return true
        }
    } else {
        return a === b
    }
}

export function deepUnwrap<T>(a: T): T {
    if (Array.isArray(a)) {
        const v: any[] = []
        for (let i = 0; i < a.length; i++) {
            v.push(deepUnwrap(a[i]))
        }
        return v as T
    } else if (typeof a === "object" && a !== null) {
        const v: any = { }
        for (const key of Object.keys(a)) {
            v[key] = deepUnwrap((a as any)[key])
        }
        return v
    } else {
        return a
    }
}

