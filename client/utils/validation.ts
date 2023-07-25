
export class Fail {
    reason: string
    inner: Fail | Fail[] | null
    value: any

    constructor(reason: string, value: any, inner?: Fail | Fail[]) {
        this.reason = reason
        this.value = value
        this.inner = inner ?? null
    }
}

export function fail(reason: string, value: any, inner?: Fail | Fail[]) {
    return new Fail(reason, value, inner)
}

export function string(v: any): string | Fail {
    return typeof v === "string" ? v : fail("string", v)
}

export function number(v: any): number | Fail {
    return typeof v === "number" ? v : fail("number", v)
}

export function integer(v: any): number | Fail {
    if (typeof v !== "number") return fail("integer", v)
    if (!Number.isSafeInteger(v)) return fail("integer", v)
    return v
}

export function boolean(v: any): boolean | Fail {
    return typeof v === "boolean" ? v : fail("boolean", v)
}

export function null_(v: any): null | Fail {
    return v === null ? null : fail("null", v)
}

export function any(v: any): any | Fail {
    return v
}

export type Validator = (a: any) => any | Fail
export type ValidatorFor<T> = (a: any) => T | Fail
export type ValidatorResult<T extends Validator> = Exclude<ReturnType<T>, Fail>
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
        if (typeof obj !== "object") return fail("object", obj)
        for (const key of Object.keys(spec)) {
            const r = (spec as any)[key]!(obj[key])
            if (r instanceof Fail) return fail(`.${key}`, obj[key], r)
            result[key] = r
        }
        for (const key of Object.keys(obj)) {
            if (!spec.hasOwnProperty(key)) return fail(`.${key}: expected to be undefined`, obj[key])
        }
        return result as ObjectResult<T>
    }
}

export function openObject<T extends ObjectValidator, U extends Validator>(spec: T, rest: U): ((obj: any) => ObjectResult<T & Record<string, U>>) {
    return (obj: any) => {
        const result: any = { }
        if (typeof obj !== "object") return fail("object", obj)
        for (const key of Object.keys(spec)) {
            const r = (spec as any)[key]!(obj[key])
            if (r instanceof Fail) return fail(`.${key}`, obj[key], r)
            result[key] = r
        }
        for (const key of Object.keys(obj)) {
            if (!spec.hasOwnProperty(key)) {
                const r = rest(obj[key])
                if (r instanceof Fail) return fail(`.*${key}`, obj[key], r)
                result[key] = r
            }
        }
        return result as ObjectResult<T>
    }
}

export function array<T extends Validator>(spec: T): ((obj: any) => ValidatorResult<T>[] | Fail) {
    return (obj: any) => {
        const result = []
        if (!Array.isArray(obj)) return fail("array", obj)
        const length = obj.length
        for (let i = 0; i < length; i++) {
            const value = obj[i]
            if (value === undefined && !obj.hasOwnProperty(i)) return fail(`[${i}]: missing`, obj)
            const r = spec(value)
            if (r instanceof Fail) return fail(`[${i}]`, value, r)
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
        if (obj !== spec) return fail(`literal '${spec}'`, obj)
        return spec
    }
}

export function type<T extends Validator>(name: string, spec: T): ((obj: any) => ValidatorResult<T> | Fail) {
    return (obj: any) => {
        const r = spec(obj)
        if (r instanceof Fail) return fail(`<${name}>`, obj, r)
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
        return fail("", obj, fails)
    }
}

export function formatGot(value: any) {
    return typeof value
}

export function formatFail(fail: Fail): string {
    if (Array.isArray(fail.inner)) {
        if (fail.reason) {
            return `${fail.reason}: expected any of (${fail.inner.map(formatFail).join(", ")})`
        } else {
            return `any of (${fail.inner.map(formatFail).join(" | ")})`
        }
    } else if (fail.inner instanceof Fail) {
        const inner = formatFail(fail.inner)
        if (inner.startsWith(".") || inner.startsWith("[") || inner.startsWith("<")) {
            return fail.reason + inner
        } else {
            return `${fail.reason}: expected ${inner}`
        }
    } else {
        return `${fail.reason}, got ${formatGot(fail.value)}`
    }
}

export function defaultValue<T extends Validator>(spec: T, defaultValue: ValidatorResult<T>): ((obj: any) => ValidatorResult<T> | Fail) {
    return (obj: any) => {
        if (obj === undefined) return defaultValue
        return spec(obj)
    }
}

export function hint<T>(spec: ValidatorFor<T>): ((obj: any) => T | Fail) {
    return (obj: any) => {
        return spec(obj)
    }
}

class ValidationError extends Error { }

export function validate<T extends Validator>(spec: T, obj: any): ValidatorResult<T> {
    const r = spec(obj)
    if (r instanceof Fail) {
        throw new ValidationError(formatFail(r))
    }
    return r
}

export const toNull = defaultValue(null_, null)
