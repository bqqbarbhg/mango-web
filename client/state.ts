import { createState } from "kaiku"
import * as V from "./utils/validation"

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
    token: string
    sources: Source[]
    volumes: Volume[]
}

export type ErrorReport = {
    context: string
    error: Error | string
    time: number
    id: string
    closed: boolean
    opened: boolean
}

export type RouteIndex = { path: "/" }
export type RouteRegister = { path: "/register" }
export type RouteRead = { path: "/read/", id: string }
export type RouteSettings = { path: "/settings/", tab: string | null }
export type Route = RouteIndex | RouteRegister | RouteSettings | RouteRead

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

    m = path.match(/^\/settings\/?$/)
    if (m) return { path: "/settings/", tab: null }

    m = path.match(/^\/settings\/(\w+)$/)
    if (m) return { path: "/settings/", tab: m[1]! }

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

let errorIdCounter = 0
export function pushError(context: string, error: Error | string, opts: {
    deduplicate?: boolean
} = { }) {

    const id = (++errorIdCounter).toString()
    globalState.errors.push({
        context, error, id,
        time: Date.now(),
        closed: false,
        opened: false,
    })
    const errorRef = globalState.errors[globalState.errors.length - 1]

    setTimeout(() => {

        if (opts.deduplicate) {
            for (const error of globalState.errors) {
                if (error.id !== id && error.context === context && !error.closed) {
                    closeError(error.id)
                }
            }
        }

        errorRef!.opened = true
    }, 1)

    const maxVisibleErrors = 5
    if (globalState.errors.length > maxVisibleErrors) {
        globalState.errors.splice(0, 1)
    }
}

export function closeError(id: string) {
    const err = globalState.errors.find(err => err.id === id)
    if (err && !err.closed) {
        err.closed = true
        setTimeout(() => {
            globalState.errors = globalState.errors.filter(err => err.id !== id)
            console.log("remove")
        }, 300)
    }
}

export function clearErrors() {
    globalState.errors = []
}

const userSpec = V.type("user", V.object({
    name: V.string,
    token: V.string,
}))

function loadUser(): User | null {
    try {
        const userJson = localStorage.getItem("user")
        if (!userJson) return null
        const anyUser = JSON.parse(userJson)
        const user = userSpec(anyUser)
        if (user instanceof V.Fail) {
            console.error("Failed to load user, expected", V.formatFail(user))
            return null
        }

        return {
            ...user,
            sources: [],
            volumes: [],
        }
    } catch (err) {
        console.log(err)
        return null
    }
}

export const globalState = createState<State>({
    route: parseRoute(window.location),
    errors: [],
    user: loadUser(),
})
