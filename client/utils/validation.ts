
export class Fail {
    reason: string
    inner: Fail | Fail[] | null

    constructor(reason: string, inner?: Fail | Fail[]) {
        this.reason = reason
        this.inner = inner ?? null
    }
}

export function fail(reason: string, inner?: Fail | Fail[]) {
    return new Fail(reason, inner)
}

export function string(v: any): string | Fail {
    return typeof v === "string" ? v : fail("string")
}

export function number(v: any): number | Fail {
    return typeof v === "number" ? v : fail("number")
}

export function boolean(v: any): boolean | Fail {
    return typeof v === "boolean" ? v : fail("boolean")
}

type Validator = (a: any) => any | Fail
type ValidatorResult<T extends Validator> = Exclude<ReturnType<T>, Fail>
type ObjectValidator = {
    [key: string]: Validator
}
type ObjectResult<T extends ObjectValidator> = {
    [key in keyof T]: ValidatorResult<T[key]>
} | Fail
type UnionValidator = {
    [key: number]: Validator
}
type UnionResult<T extends UnionValidator> = {
    [key in keyof T]: ValidatorResult<T[key]>
}[number] | Fail

export function object<T extends ObjectValidator>(spec: T): ((obj: any) => ObjectResult<T>) {
    return (obj: any) => {
        const result: any = { }
        if (typeof obj !== "object") return fail("object")
        for (const key of Object.keys(spec)) {
            const r = (spec as any)[key]!(obj[key])
            if (r instanceof Fail) return fail(`.${key}`, r)
            result[key] = r
        }
        return result as ObjectResult<T>
    }
}

export function array<T extends Validator>(spec: T): ((obj: any) => ValidatorResult<T>[] | Fail) {
    return (obj: any) => {
        const result = []
        if (!Array.isArray(spec)) return fail("array")
        for (const value of obj) {
            const r = spec(value)
            if (r instanceof Fail) return fail(`[${result.length}]`, r)
            result.push(r)
        }
        return result
    }
}

export function maybe<T extends Validator>(spec: T): ((obj: any) => ValidatorResult<T> | undefined | Fail) {
    return (obj: any) => {
        if (obj === undefined) return undefined
        return spec(obj)
    }
}

export function literal<T extends string | number | boolean>(spec: T): ((obj: any) => T | Fail) {
    return (obj: any) => {
        if (obj !== spec) return fail(`literal '${spec}'`)
        return spec
    }
}

export function type<T extends Validator>(name: string, spec: T): ((obj: any) => ValidatorResult<T> | Fail) {
    return (obj: any) => {
        const r = spec(obj)
        if (r instanceof Fail) return fail(name, r)
        return r
    }
}

export function union<T extends UnionValidator>(spec: T): ((obj: any) => UnionResult<T>) {
    return (obj: any) => {
        const fails: Fail[] = []
        for (const s of (spec as unknown as Validator[])) {
            const r = s(obj)
            if (r instanceof Fail) {
                fails.push(r)
            } else {
                return r
            }
        }
        return fail("", fails)
    }
}

export function formatFail(fail: Fail): string {
    if (Array.isArray(fail.inner)) {
        if (fail.reason) {
            return `${fail.reason}: (${fail.inner.map(formatFail).join(", ")})`
        } else {
            return `(${fail.inner.map(formatFail).join(" | ")})`
        }
    } else if (fail.inner instanceof Fail) {
        const inner = formatFail(fail.inner)
        if (inner.startsWith(".") || inner.startsWith("[")) {
            return fail.reason + inner
        } else {
            return `${fail.reason}: ${inner}`
        }
    } else {
        return fail.reason
    }
}
