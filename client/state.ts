import { createState, useEffect } from "kaiku"
import * as V from "./utils/validation"
import { setApiToken } from "./utils/api"
import type { OverlayState } from "./reader/overlay-manager"

export type Source = {
    url: string
    uuid: string
}

export const LangString = V.type("LangString", V.openObject({
    en: V.string,
}, V.string))

export const VolumeInfo = V.type("VolumeInfo", V.object({
    path: V.string,
    info: V.object({
        title: LangString,
        volume: V.union([V.integer, V.toNull]),
        numPages: V.integer,
    }),
}))
export type VolumeInfo = V.ValidatorResult<typeof VolumeInfo>

export const SourceIndex = V.type("SourceIndex", V.object({
    volumes: V.array(VolumeInfo)
}))

export const MangoChapter = V.type("MangoChapter", V.object({
    title: LangString,
    startPage: V.integer,
    index: V.integer,
}))
export type MangoChapter = V.ValidatorResult<typeof MangoChapter>

export const MangoInfo = V.type("MangoInfo", V.openObject({
    title: LangString,
    startPage: V.integer,
    volume: V.integer,
    chapters: V.array(MangoChapter),
}, V.any))
export type MangoInfo = V.ValidatorResult<typeof MangoInfo>

export const MangoContent = V.type("MangoContent", V.object({
    files: V.array(V.union([
        V.object({
            mipLevel: V.integer,
            format: V.string,
            batch: V.literal(false),
            pages: V.array(V.string),
        }),
        V.object({
            mipLevel: V.integer,
            format: V.string,
            batch: V.literal(true),
            pages: V.array(V.object({
                base: V.integer,
                count: V.integer,
                name: V.string,
            })),
        }),
    ])),
    pages: V.array(V.object({
        width: V.integer,
        height: V.integer,
    })),
}))
export type MangoContent = V.ValidatorResult<typeof MangoContent>

export type Volume = {
    sourceUrl: string
    sourceUuid: string
    volume: VolumeInfo
}

export type SourceInfo = { url: string, uuid: string }

export type CurrentVolume = {
    path: string
    info: MangoInfo
    content: MangoContent
    source: SourceInfo
    currentPage: number
    readPages: number[]
}

export type User = {
    name: string
    token: string
    sources: Source[]
    volumes: Volume[]
    currentVolume: CurrentVolume | null
    overlay: OverlayState | null
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

export type ErrorKind = "error" | "fetch" | "api" | "user" | "source"

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
            currentVolume: null,
            overlay: null,
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

useEffect(() => {
    const route = globalState.route
    let title = ""
    if (route.path === "/register") {
        title = "Register"
    } else if (route.path === "/") {
        title = "Listing"
    } else if (route.path === "/read/") {
        const currentVolume = globalState.user?.currentVolume ?? null
        if (currentVolume && currentVolume.path === route.id) {
            const { info } = currentVolume
            const volumeTitle = info.title.jp ?? info.title.en
            title = info.volume ? `${volumeTitle}${info.volume}` : volumeTitle
        } else {
            title = "Loading..."
        }
    } else if (route.path === "/settings/") {
        title = "Settings"
    }
    document.title = `${title} | Mango`
})

if (process.env.NODE_ENV !== "production") {
    (window as any).globalState = globalState;
    (window as any).ds = (obj: any) => {
        console.log(JSON.stringify(obj, null, 2))
    }
}
