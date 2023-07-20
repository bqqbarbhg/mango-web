import apiRoutes from "../../common/api-routes"
import type { TypeOf } from "io-ts"
import { json, RequestHandler, Router } from "express"

type ApiRoutes = typeof apiRoutes

export function apiRoute<Route extends keyof ApiRoutes>(
    r: Router,
    route: Route,
    func: (req: TypeOf<typeof apiRoutes[Route]["req"]>)
        => Promise<TypeOf<typeof apiRoutes[Route]["res"]>>) {

    const params = route.split("/")
        .filter(p => p.startsWith(":"))
        .map(p => p.substring(1))

    const { req: validateReq, res: validateRes } = apiRoutes[route]

    const handler: RequestHandler = (req, res) => {
        console.log(req.body)
        const body = req.body ?? { }
        for (const param of params) {
            body[param] = req.params[param]
        }
        console.log(body)
        const reqBody = validateReq.decode(body)

        if (reqBody._tag === "Right") {
            func(reqBody.right)
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
                    res.status(400)
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
