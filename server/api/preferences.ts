import { apiRouteAuth } from "../utils/api"
import { db } from "../utils/database"
import sql from "sql-template-strings"
import * as t from "io-ts"

apiRouteAuth("POST /preferences", async (req, user) => {
    await db.run(sql`
        UPDATE Users
        SET settings=${JSON.stringify(req.preferences)}
        WHERE id=${user.userId}
    `)
    return { }
})

apiRouteAuth("GET /preferences", async (req, user) => {
    const { settings } = await db.select(t.type({
        settings: t.union([t.string, t.null]),
     }), sql`
        SELECT settings
        FROM Users
        WHERE id=${user.userId}
    `)
    return {
        preferences: settings ? JSON.parse(settings) : null,
    }
})

