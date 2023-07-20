import apiRoutes from "../../common/api-routes"
import type { TypeOf } from "io-ts"

type ApiRoutes = typeof apiRoutes

export async function apiCall<Route extends keyof ApiRoutes>(
    route: Route,
    req: TypeOf<typeof apiRoutes[Route]["req"]>)
       : Promise<TypeOf<typeof apiRoutes[Route]["res"]>> {

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

    const hasBody = method === "POST"
    const response = await fetch(finalPath, {
        method,
        headers: {
            "Content-Type": "application/json",
        },
        body: hasBody ? JSON.stringify(body) : undefined,
    })
    const json = await response.json()

    if (json.error) {
        throw new Error(`API error: ${route}: ${json.error}`)
    } else {
        return json
    }
}

