import * as t from "io-ts"

const Session = t.type({
    uuid: t.string,
    device: t.string,
})

const SourceAuth = t.union([
    t.type({
        type: t.literal("none"),
    }),
    t.type({
        type: t.literal("basic"),
        username: t.string,
        password: t.string,
    }),
])

const Source = t.type({
    uuid: t.string,
    url: t.string,
    auth: SourceAuth,
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
            preferences: t.UnknownRecord,
        }),
    },
    "POST /auth/logout": {
        req: t.type({ }),
        res: t.type({
            ok: t.boolean,
        }),
    },
    "POST /auth/password": {
        req: t.type({
            oldPassword: t.string,
            newPassword: t.string,
        }),
        res: t.type({ }),
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

    // -- preferences --
    "POST /preferences": {
        req: t.type({
            preferences: t.UnknownRecord,
        }),
        res: t.type({ }),
    },
    "GET /preferences": {
        req: t.type({ }),
        res: t.type({
            preferences: t.UnknownRecord,
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
            auth: SourceAuth,
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
    "GET /volumes": {
        req: t.type({ }),
        res: t.type({
            sources: t.array(t.type({
                path: t.string,
                latestPage: t.union([t.number, t.null]),
            })),
        }),
    },
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
                        Source,
                        t.null,
                    ]),
                    page: t.union([t.number, t.null]),
                    readPages: t.array(t.number),
                }),
                t.null,
            ]),
        }),
    },

    // -- flashcards --
    "POST /flashcards": {
        req: t.type({
            word: t.string,
            example: t.string,
            data: t.UnknownRecord,
        }),
        res: t.type({
            uuid: t.string,
        }),
    },
    "GET /flashcards": {
        req: t.type({ }),
        res: t.type({
            results: t.array(t.type({
                word: t.string,
                uuid: t.string,
                example: t.string,
                addedTime: t.number,
                answerTime: t.number,
                answerHistory: t.number,
                answersTotal: t.number,
                answersCorrect: t.number,
            })),
        }),
    },
    "GET /flashcards/:uuid": {
        req: t.type({
            uuid: t.string,
        }),
        res: t.type({
            word: t.string,
            uuid: t.string,
            example: t.string,
            addedTime: t.number,
            answerHistory: t.number,
            answersTotal: t.number,
            answersCorrect: t.number,
            answerTime: t.number,
            info: t.any,
        }),
    },
    "POST /flashcards/:uuid/answer": {
        req: t.type({
            uuid: t.string,
            correct: t.boolean,
        }),
        res: t.type({
            answerHistory: t.number,
            answersTotal: t.number,
            answersCorrect: t.number,
            answerTime: t.number,
        }),
    },
    "DELETE /flashcards/:uuid": {
        req: t.type({
            uuid: t.string,
        }),
        res: t.type({ }),
    },

    // -- deploy
    "POST /deploy/:key": {
        req: t.type({
            key: t.string,
        }),
        res: t.type({ }),
    },

} as const

export default apiRoutes
