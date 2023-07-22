import apiRoutes from "../../common/api-routes"
import type { TypeOf } from "io-ts"
import { RequestHandler, Router, Request } from "express"
import { verifyJwtToken } from "./auth"

type ApiRoutes = typeof apiRoutes

export type ApiContext = {
    request: Request
}

export type ApiUser = {
    id: string
    username: string
}

export class HttpError extends Error {
    code: number

    constructor(code: number, message: string) {
        super(message)
        this.code = code
    }
}

export function apiRoute<Route extends keyof ApiRoutes>(
    r: Router,
    route: Route,
    func: (req: TypeOf<typeof apiRoutes[Route]["req"]>, ctx: ApiContext)
        => Promise<TypeOf<typeof apiRoutes[Route]["res"]>>) {

    const params = route.split("/")
        .filter(p => p.startsWith(":"))
        .map(p => p.substring(1))

    const { req: validateReq, res: validateRes } = apiRoutes[route]

    const handler: RequestHandler = (req, res) => {
        const body = req.body ?? { }
        for (const param of params) {
            body[param] = req.params[param]
        }
        const reqBody = validateReq.decode(body)

        const ctx = {
            request: req,
        }

        if (reqBody._tag === "Right") {
            func(reqBody.right, ctx)
                .then((result) => {
                    const resBody = validateRes.decode(result)
                    if (resBody._tag === "Right") {
                        res.status(200)
                        res.json(resBody.right)
                    } else {
                        res.status(500)
                        res.json({ error: "internal validation failure", errors: resBody.left })
                    }
                })
                .catch((err) => {
                    if (err instanceof HttpError) {
                        res.status(err.code)
                    } else {
                        res.status(400)
                    }
                    res.json({ error: err.message ?? "" })
                })
        } else {
            res.status(400)
            res.json({ error: "failed to parse body", errors: reqBody.left })
        }
    }

    const [method, path] = route.split(" ", 2)
    if (method === "GET") {
        r.get(path!, handler)
    } else if (method === "POST") {
        r.post(path!, handler)
    } else {
        throw new Error(`Unknown method in route: ${route}`)
    }
}

export function apiRouteAuth<Route extends keyof ApiRoutes>(
    r: Router,
    route: Route,
    func: (req: TypeOf<typeof apiRoutes[Route]["req"]>, user: ApiUser, ctx: ApiContext)
        => Promise<TypeOf<typeof apiRoutes[Route]["res"]>>) {

    apiRoute(r, route, async (req, ctx) => {
        const auth = ctx.request.get("Authorization") ?? ""
        if (auth === "") {
            throw new HttpError(401, "Unauthorized")
        }

        const [bearer, token] = auth.split(" ", 2)
        if (!bearer || !token || bearer.toLowerCase() !== "bearer") {
            throw new HttpError(401, "Authorization header not Bearer")
        }

        const [userId, jwtToken] = token.split("-", 2)
        if (!userId || !jwtToken) {
            throw new HttpError(401, "Bad JWT token in Authorization")
        }

        const payload = await verifyJwtToken(userId, jwtToken)
        return func(req, payload, ctx)
    })
}
