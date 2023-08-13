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

    // -- volumes --
    "POST /read/:*path": {
        req: t.type({
            path: t.string,
            sourceUuid: t.union([t.string, t.null]), // TODO: Undefined
            page: t.number,
        }),
        res: t.type({
            ok: t.boolean,
        }),
    },
    "GET /read/:*path": {
        req: t.type({
            path: t.string,
        }),
        res: t.type({
            result: t.union([
                t.type({
                    source: t.union([
                        t.type({
                            uuid: t.string,
                            url: t.string,
                        }),
                        t.null,
                    ]),
                    page: t.union([t.number, t.null]),
                    readPages: t.array(t.number),
                }),
                t.null,
            ]),
        }),
    },



} as const

export default apiRoutes
