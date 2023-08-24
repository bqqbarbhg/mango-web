import apiRoutes from "../../common/api-routes"
import type { TypeOf } from "io-ts"
import { RequestHandler, Router, Request } from "express"
import { verifyJwt } from "./auth"
import { db } from "./database"
import sql from "sql-template-strings"
import * as t from "io-ts"

export let apiRouter = Router()

type ApiRoutes = typeof apiRoutes

export type ApiContext = {
    request: Request
}

export type ApiUser = {
    sessionId: number
    userId: number
}

export class HttpError extends Error {
    code: number

    constructor(code: number, message: string) {
        super(message)
        this.code = code
    }
}

export class UserError extends HttpError {
    inner: Error | null

    constructor(message: string, inner: Error|null = null, code: number = 400) {
        super(code, message)
        this.inner = inner
    }
}

export function apiRoute<Route extends keyof ApiRoutes>(
    route: Route,
    func: (req: TypeOf<typeof apiRoutes[Route]["req"]>, ctx: ApiContext)
        => Promise<TypeOf<typeof apiRoutes[Route]["res"]>>) {

    let [method, path] = route.split(" ", 2) as [string, string]

    const params = path.split("/")
        .filter(p => p.startsWith(":"))
        .map(p => p.substring(1))

    const suffixIndex = path.indexOf(":*")
    if (suffixIndex >= 0) {
        path = path.substring(0, suffixIndex) + "*"
    }

    const { req: validateReq, res: validateRes } = apiRoutes[route]

    const handler: RequestHandler = (req, res) => {
        const body = req.body ?? { }
        for (const param of params) {
            if (param.startsWith("*")) {
                body[param.substring(1)] = req.params["0"]
            } else {
                body[param] = req.params[param]
            }
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

                    const showError = process.env.NODE_ENV !== "production"
                    if (err instanceof UserError) {
                        res.json({
                            userError: err.message ?? "",
                            error: showError ? (err.inner?.message ?? ""): "",
                        })
                    } else {
                        res.json({ error: showError ? (err.message ?? "") : "" })
                    }
                })
        } else {
            res.status(400)
            res.json({ error: "failed to parse body", errors: reqBody.left })
        }
    }

    if (method === "GET") {
        apiRouter.get(path, handler)
    } else if (method === "DELETE") {
        apiRouter.delete(path, handler)
    } else if (method === "POST") {
        apiRouter.post(path, handler)
    } else {
        throw new Error(`Unknown method in route: ${route}`)
    }
}

export function apiRouteAuth<Route extends keyof ApiRoutes>(
    route: Route,
    func: (req: TypeOf<typeof apiRoutes[Route]["req"]>, user: ApiUser, ctx: ApiContext)
        => Promise<TypeOf<typeof apiRoutes[Route]["res"]>>) {

    apiRoute(route, async (req, ctx) => {
        const auth = ctx.request.get("Authorization") ?? ""
        if (auth === "") {
            throw new HttpError(401, "Unauthorized")
        }

        const [bearer, token] = auth.split(" ", 2)
        if (!bearer || !token || bearer.toLowerCase() !== "bearer") {
            throw new HttpError(401, "Authorization header not Bearer")
        }

        const payload = verifyJwt(token)

        const verify = await db.selectOptional(t.type({ id: t.number }), sql`
            SELECT id FROM Sessions WHERE id=${payload.sessionId}
        `)
        if (!verify || payload.sessionId !== verify.id) {
            throw new HttpError(401, "outdated session")
        }

        return func(req, payload, ctx)
    })
}
