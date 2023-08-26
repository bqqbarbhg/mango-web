import { UserError, apiRouteAuth } from "../utils/api"
import * as t from "io-ts"
import sql from "sql-template-strings"
import { db } from "../utils/database"
import { v4 as uuidv4 } from "uuid"

apiRouteAuth("GET /sources", async (req, user) => {
    const sources = await db.selectAll(t.type({
        url: t.string,
        uuid: t.string,
        auth: t.string,
    }), sql`
        SELECT url, uuid, auth
        FROM Sources
        WHERE userId=${user.userId}
    `)

    return {
        sources: sources.map(({ url, uuid, auth }) => ({
            url, uuid,
            auth: JSON.parse(auth),
        }))
    }
})

apiRouteAuth("POST /sources", async (req, user) => {
    if (req.url === "") throw new UserError("Source URL cannot be empty")
    const auth = JSON.stringify(req.auth)
    const result = await db.run(sql`
        INSERT INTO Sources (userId, url, uuid, auth)
        VALUES (${user.userId}, ${req.url}, ${uuidv4()}, ${auth})
    `)
    return { ok: result.changes !== undefined && result.changes > 0 }
})

apiRouteAuth("DELETE /sources/:uuid", async (req, user) => {
    const result = await db.run(sql`
        DELETE FROM Sources
        WHERE uuid=${req.uuid}
    `)
    return { ok: result.changes !== undefined && result.changes > 0 }
})
