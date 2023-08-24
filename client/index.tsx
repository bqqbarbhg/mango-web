import { render, useEffect } from "kaiku"
import { Route, globalState, parseRoute, pushError } from "./state"
import { Index as Listing } from "./components/listing"
import { Index as Reader } from "./components/reader"
import { Index as Register } from "./components/register"
import { Index as Login } from "./components/login"
import { Index as Settings } from "./components/settings"
import { Index as Flashcards } from "./components/flashcards"
import { ErrorBar } from "./components/common/error-bar"
import { Modal } from "./components/common/modal"
import { setApiToken } from "./utils/api"
import { AppFrame } from "./components/common/app-frame"
import { Transition } from "./components/reader/transition"

window.addEventListener("popstate", () => {
    globalState.route = parseRoute(window.location)
})

useEffect(() => {
    setApiToken(globalState.user?.token ?? null)
})

function Router({ route, key }: { route: Route, key: string }) {
    if (route.path === "/register") {
        return <Register />
    } else if (globalState.user === null) {
        return <Login />
    } else if (route.path === "/") {
        return <AppFrame><Listing /></AppFrame>
    } else if (route.path === "/read/") {
        return <Reader route={route} />
    } else if (route.path === "/settings/") {
        return <AppFrame><Settings route={route} /></AppFrame>
    } else if (route.path === "/flashcards/") {
        return <AppFrame><Flashcards route={route} /></AppFrame>    } else {
        return null
    }
}

function Top() {
    let baseRoute: Route | null = null
    let readRoute: Route | null = null

    const { route, transitionRoute } = globalState
    if (route) {
        if (route.path === "/read/") {
            readRoute = route
        } else {
            baseRoute = route
        }
    }
    if (transitionRoute) {
        if (transitionRoute.path === "/read/") {
            readRoute = transitionRoute
        } else {
            baseRoute = transitionRoute
        }
    }
    const transition = globalState.transition

    return <>
        <ErrorBar/>
        <Modal/>
        <div className="top-div" style={{ display: baseRoute ? "block" : "none" }} >
            {baseRoute ? <Router route={baseRoute} key={"base"}/> : null }
        </div>
        <div className="top-div" style={{ display: readRoute ? "block" : "none" }} >
            {readRoute ? <Router route={readRoute} key={"read"}/> : null }
        </div>
        <div className="top-div" style={{ display: transition ? "block" : "none" }} >
            {transition ? <Transition /> : null}
        </div>
    </>
}

window.addEventListener("error", (e) => {
    if (e.error instanceof Error) {
        pushError("Uncaught error", e.error)
    }
})

const onResize = () => {
    const mobile = window.innerWidth <= 500

    globalState.mobile = mobile

    const rootStyle = document.documentElement.style
    rootStyle.setProperty("--app-height", `${window.innerHeight}px`)

    document.body.classList.toggle("mobile", mobile)
    document.body.classList.toggle("desktop", !mobile)
}
window.addEventListener("resize", onResize)
onResize()

const kaikuRoot = document.getElementById("kaiku-root")
if (!kaikuRoot) throw new Error("could not find root")
render(<Top />, kaikuRoot)
