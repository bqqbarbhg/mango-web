import * as t from "io-ts"

const apiRoutes = {
    "POST /users": {
        req: t.type({
            username: t.string,
            password: t.string,
        }),
        res: t.type({
            token: t.string,
        }),
    },
    "POST /login": {
        req: t.type({
            username: t.string,
            password: t.string,
        }),
        res: t.type({
            token: t.string,
        }),
    },
    "GET /users/:id": {
        req: t.type({
            id: t.string,
        }),
        res: t.type({
            name: t.string,
        }),
    },
    "GET /user/settings": {
        req: t.type({}),
        res: t.type({
            test: t.string,
        }),
    },
} as const

export default apiRoutes
