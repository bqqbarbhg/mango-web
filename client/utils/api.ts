import apiRoutes from "../../common/api-routes"
import { MangoError, clearUser, globalState } from "../state"
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
            const paramName = part.substring(part.startsWith(":*") ? 2 : 1)
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

    let response: Response
    let json: any
    try {
        const hasBody = method === "POST"
        response = await fetch(finalPath, {
            method, headers,
            body: hasBody ? JSON.stringify(body) : undefined,
        })
        json = await response.json()

        if (!options.apiToken && implicitApiToken && response.status === 401) {
            implicitApiToken = null
            clearUser()
        }
    } catch (err) {
        throw new MangoError("fetch", `${method} ${finalPath}: ${err.message ?? ""}`)
    }

    if (response.status !== 200) {
        if (json.userError) {
            throw new MangoError("user", json.userError)
        } else {
            throw new MangoError("api", `${method} ${finalPath}: ${json.error ?? ""}`)
        }
    } else {
        return json
    }
}

