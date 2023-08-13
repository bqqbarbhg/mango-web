import { render, useEffect } from "kaiku"
import { globalState, parseRoute, pushError } from "./state"
import { Index as Listing } from "./components/listing"
import { Index as Reader } from "./components/reader"
import { Index as Register } from "./components/register"
import { Index as Login } from "./components/login"
import { Index as Settings } from "./components/settings"
import { ErrorBar } from "./components/common/error-bar"
import { setApiToken } from "./utils/api"
import { AppFrame } from "./components/common/app-frame"

window.addEventListener("popstate", () => {
    globalState.route = parseRoute(window.location)
})

useEffect(() => {
    setApiToken(globalState.user?.token ?? null)
})

function Router() {
    const route = globalState.route
    if (route.path === "/register") {
        return <Register />
    } else if (globalState.user === null) {
        return <Login />
    } else if (route.path === "/") {
        return <AppFrame><Listing /></AppFrame>
    } else if (route.path === "/read/") {
        return <Reader />
    } else if (route.path === "/settings/") {
        return <AppFrame><Settings /></AppFrame>
    } else {
        return null
    }
}

function Top() {
    return <>
        <ErrorBar/>
        <Router/>
    </>
}

window.addEventListener("error", (e) => {
    if (e.error instanceof Error) {
        pushError("Uncaught error", e.error)
    }
})

const kaikuRoot = document.getElementById("kaiku-root")
if (!kaikuRoot) throw new Error("could not find root")
render(<Top />, kaikuRoot)
