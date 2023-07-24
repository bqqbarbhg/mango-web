import * as t from "io-ts"

const Session = t.type({
    uuid: t.string,
    device: t.string,
})

const Source = t.type({
    uuid: t.string,
    url: t.string,
})

const apiRoutes = {
    // -- auth --
    "POST /auth/register": {
        req: t.type({
            username: t.string,
            email: t.string,
            password: t.string,
        }),
        res: t.type({ }),
    },
    "POST /auth/login": {
        req: t.type({
            username: t.string,
            password: t.string,
            device: t.string,
        }),
        res: t.type({
            token: t.string,
        }),
    },
    "POST /auth/logout": {
        req: t.type({ }),
        res: t.type({
            ok: t.boolean,
        }),
    },
    "GET /auth/sessions": {
        req: t.type({ }),
        res: t.type({
            sessions: t.array(Session),
        }),
    },
    "DELETE /auth/sessions": {
        req: t.type({ }),
        res: t.type({
            count: t.number,
        }),
    },
    "DELETE /auth/sessions/:uuid": {
        req: t.type({
            uuid: t.string,
        }),
        res: t.type({
            ok: t.boolean,
        }),
    },

    // -- sources --
    "GET /sources": {
        req: t.type({ }),
        res: t.type({
            sources: t.array(Source),
        }),
    },
    "POST /sources": {
        req: t.type({
            url: t.string,
        }),
        res: t.type({
            ok: t.boolean,
        }),
    },
    "DELETE /sources/:uuid": {
        req: t.type({
            uuid: t.string,
        }),
        res: t.type({ }),
    },

    // -- legacy -- 
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
