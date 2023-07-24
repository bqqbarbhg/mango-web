import apiRoutes from "../../common/api-routes"
import { MangoError, globalState } from "../state"
import type { TypeOf } from "io-ts"

type ApiRoutes = typeof apiRoutes

let implicitApiToken: string | null = null

export function setApiToken(token: string | null) {
    implicitApiToken = token
}

export async function apiCall<Route extends keyof ApiRoutes>(
        route: Route,
        req: TypeOf<typeof apiRoutes[Route]["req"]>,
        options: {
            apiToken?: string
        } = { }
    ) : Promise<TypeOf<typeof apiRoutes[Route]["res"]>> {

    const [method, path] = route.split(" ", 2)

    const body = { ...req } as Record<string, any>

    let finalPath = "/api"
    for (const part of path!.substring(1).split("/")) {
        if (part.startsWith(":")) {
            const paramName = part.substring(1)
            const param = body[paramName]
            if (typeof param !== "string" && typeof param !== "number") {
                throw new Error(`Bad parameter for ${paramName}: ${param}`)
            }
            finalPath += "/" + param.toString()
            delete body[paramName]
        } else {
            finalPath += "/" + part
        }
    }

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }

    const apiToken = options.apiToken ?? implicitApiToken
    if (apiToken && apiToken !== "") {
        headers["Authorization"] = `Bearer ${apiToken}`
    }

    const hasBody = method === "POST"
    const response = await fetch(finalPath, {
        method, headers,
        body: hasBody ? JSON.stringify(body) : undefined,
    })
    const json = await response.json()

    if (!options.apiToken && implicitApiToken && response.status === 401) {
        implicitApiToken = null
        globalState.user = null
        localStorage.removeItem("user")
    }

    if (response.status !== 200) {
        if (json.userError) {
            throw new MangoError("user", json.userError)
        } else {
            throw new MangoError("api", json.error ?? "")
        }
    } else {
        return json
    }
}

