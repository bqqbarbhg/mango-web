import { createState } from "kaiku"
import * as V from "./utils/validation"
import { setApiToken } from "./utils/api"

export type Source = {
    url: string
    uuid: string
}

export const VolumeInfo = V.type("VolumeInfo", V.object({
    path: V.string,
    info: V.object({
        title: V.openObject({
            en: V.string,
        }, V.string),
        volume: V.union([V.integer, V.toNull]),
        numPages: V.integer,
    }),
}))
declare type VolumeInfo = V.ValidatorResult<typeof VolumeInfo>

export const SourceIndex = V.type("SourceIndex", V.object({
    volumes: V.array(VolumeInfo)
}))


export type Volume = {
    sourceUrl: string
    sourceUuid: string
    volume: VolumeInfo
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
export type RouteRead = { path: "/read/", id: string, source: string | null }
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

    const urlParams = new URLSearchParams(location.search)

    m = path.match(/^\/?$/)
    if (m) return { path: "/" }

    m = path.match(/^\/register$/)
    if (m) return { path: "/register" }

    m = path.match(/^\/read\/(.*)$/)
    if (m) return { path: "/read/", id: m[1]!, source: urlParams.get("source") }

    m = path.match(/^\/settings\/?$/)
    if (m) return { path: "/settings/", tab: null }

    m = path.match(/^\/settings\/(\w+)$/)
    if (m) return { path: "/settings/", tab: m[1]! }

    return { path: "/" }
}

export type ErrorKind = "error" | "fetch" | "api" | "user"

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
        }, 300)
    }
}

export function clearErrors() {
    globalState.errors = []
    console.error("UH")
}

export function clearUser() {
    globalState.user = null
    localStorage.removeItem("user")
    setApiToken(null)
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

export function navigateTo(path: string) {
    clearErrors()
    window.history.pushState(null, "", path)
    globalState.route = parseRoute(window.location)
}

export const globalState = createState<State>({
    route: parseRoute(window.location),
    errors: [],
    user: loadUser(),
})

if (process.env.NODE_ENV !== "production") {
    (window as any).globalState = globalState
}
