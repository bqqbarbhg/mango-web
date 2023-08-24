import { apiRouteAuth } from "../utils/api"
import * as t from "io-ts"
import sql from "sql-template-strings"
import { db } from "../utils/database"

apiRouteAuth("GET /volumes", async (req, user) => {
    const sources = await db.selectAll(t.type({
        path: t.string,
        latestPage: t.union([t.number, t.null]),
    }), sql`
        SELECT path, latestPage
        FROM VolumeState
        WHERE userId=${user.userId}
    `)
    return { sources }
})
