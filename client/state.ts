import { createState } from "kaiku"

export type Source = {
    url: string
    uuid: string
}

export type Volume = {
    sourceUrl: string
    info: {
        path: string
        title: {
            en: string,
            jp: string,
        }
        volume: number
    }
}

export type User = {
    name: string
    sources: Source[]
    volumes: Volume[]
}

export type ErrorReport = {
    context: string
    error: Error | string
    time: number
}

export type RouteIndex = { path: "/" }
export type RouteRegister = { path: "/register" }
export type RouteRead = { path: "/read/", id: string }
export type Route = RouteIndex | RouteRegister | RouteRead

export type State = {
    route: Route
    errors: ErrorReport[]
    user: User | null
}

export function parseRoute(location: Location): Route {
    const path = location.pathname
    let m

    m = path.match(/^\/?$/)
    if (m) return { path: "/" }

    m = path.match(/^\/register$/)
    if (m) return { path: "/register" }

    m = path.match(/^\/read\/(.*)$/)
    if (m) return { path: "/read/", id: m[1]! }

    return { path: "/" }
}

export type ErrorKind = "error" | "api" | "user"

export class MangoError extends Error {
    kind: ErrorKind
    inner: Error | null
    constructor(kind: ErrorKind, message: string, inner: Error | null = null) {
        super(message)
        this.kind = kind
        this.inner = inner
    }
}

export function pushError(context: string, error: Error | string) {
    globalState.errors.push({ context, error, time: Date.now() })
}

export const globalState = createState({
    route: parseRoute(window.location),
    errors: [],
    user: null,
} as State)
