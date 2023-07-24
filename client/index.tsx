/*
import { SourceList } from "./components/settings/source-list"
import { Source, globalState } from "./state"
import { apiCall, setApiToken } from "./utils/api"
*/

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

/*
async function testSettings() {
    try {
        const settings = await apiCall("GET /user/settings", { })
        console.log(settings)
    } catch (e) {
        console.error(e)
    }
}
testSettings()

function IndexTop() {
    const state = useState({
        username: "",
        password: "",
        pending: false,
    })

    const register = async (e: any) => {
        e.preventDefault()
        try {
            state.pending = true
            const registerResult = await apiCall("POST /auth/register", {
                username: state.username,
                password: state.password,
            })
            console.log(registerResult)
        } catch (err) {
            console.warn(err)
        }

        try {
            const loginResult = await apiCall("POST /auth/login", {
                username: state.username,
                password: state.password,
                device: navigator.userAgent,
            })
            console.log(loginResult)

            setApiToken(loginResult.token)

            const sources = await apiCall("GET /sources", {})

            globalState.user = {
                name: state.username,
                sources: sources.sources,
                volumes: [],
            }

        } catch (e) {
            console.error(e)
        } finally {
            state.pending = false
        }
    }

    async function refreshSource(source: Source) {
        try {
            const r = await fetch(`${source.url}/index.json`)
            const result = await r.json()
            return result.volumes.map((volume: any) => ({
                ...volume,
                sourceUrl: `${source.url}/${volume.path}`,
            }))
        } catch (err) {
            console.error(err)
            return []
        }
    }

    async function refreshSources() {
        const user = globalState.user
        if (!user) return
        const sources = user.sources

        const promises = sources.map(s => refreshSource(s))
        const results = await Promise.all(promises)
        const volumes = results.flat()
        user.volumes = volumes
    }

    return <>
        <form onSubmit={register}>
            <div>
                <label for="username">Username</label>
                <input type="text" id="username" name="username" disabled={state.pending}
                    value={() => state.username} onInput={(e: any) => state.username = e.target.value } />
            </div>
            <div>
                <label for="password">Password</label>
                <input type="password" id="password" name="password" disabled={state.pending}
                    value={() => state.password} onInput={(e: any) => state.password = e.target.value } />
            </div>
            <div>
                <input type="submit" value="Register" />
            </div>
        </form>
        <div>
            <SourceList />
        </div>
        <div>
            <button onClick={refreshSources}>Refresh</button>
        </div>
        <div>
            {(globalState.user?.volumes ?? []).map(volume => (
                <div>
                    <h3>{volume.info.title.jp}</h3>
                    <img src={`${volume.sourceUrl}/cover.jpg`} />
                </div>
            ))}
        </div>
    </>
}

*/