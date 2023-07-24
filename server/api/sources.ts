import { apiRouteAuth } from "../utils/api"
import * as t from "io-ts"
import sql from "sql-template-strings"
import { run, select, selectAll } from "../utils/database"
import { v4 as uuidv4 } from "uuid"

apiRouteAuth("GET /sources", async (req, user) => {
    const sources = await selectAll(t.type({
        url: t.string,
        uuid: t.string,
    }), sql`
        SELECT url, uuid
        FROM Sources
        WHERE userId=${user.userId}
    `)
    return { sources }
})

apiRouteAuth("POST /sources", async (req, user) => {
    const result = await run(sql`
        INSERT INTO Sources (userId, url, uuid)
        VALUES (${user.userId}, ${req.url}, ${uuidv4()})
    `)
    return { ok: result.changes !== undefined && result.changes > 0 }
})

apiRouteAuth("DELETE /sources/:uuid", async (req, user) => {
    const result = await run(sql`
        DELETE FROM Sources
        WHERE uuid=${req.uuid}
    `)
    return { ok: result.changes !== undefined && result.changes > 0 }
})
