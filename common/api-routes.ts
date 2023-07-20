import * as t from "io-ts"

const apiRoutes = {
    "POST /users": {
        req: t.type({
            username: t.string,
            password: t.string,
        }),
        res: t.type({}),
    },
    "GET /users/:id": {
        req: t.type({
            id: t.string,
        }),
        res: t.type({
            name: t.string,
        }),
    }
} as const

export default apiRoutes
