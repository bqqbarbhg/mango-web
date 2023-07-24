import { UserError, apiRoute, apiRouteAuth } from "../utils/api"
import bcrypt from "bcrypt"
import { run, select, selectAll } from "../utils/database"
import * as t from "io-ts"
import sql from "sql-template-strings"
import { signJwt } from "../utils/auth"
import { v4 as uuidv4 } from "uuid"

apiRoute("POST /auth/register", async (req) => {
    const passwordHash = await bcrypt.hash(req.password, 10)

    if (req.username.length === 0) throw new UserError("Empty username")
    const badChar = req.username.match(/[^a-zA-Z0-9_\.]/)
    if (badChar) throw new UserError(`Forbidden character '${badChar[0]}' (U+${badChar[0].charCodeAt(0).toString(16).toUpperCase()}) in username`)
    if (req.password.length === 0) throw new UserError("Empty password")

    try {
        const result = await run(sql`
            INSERT INTO Users (username, password)
            VALUES (${req.username}, ${passwordHash})
        `)

        const userId = result.lastID
        if (userId === undefined) throw new Error("failed to insert user")

        return { }
    } catch (err) {
        if (err instanceof Error && err.message.includes("UNIQUE constraint failed: Users.username")) {
            throw new UserError(`Username is taken: ${req.username}`, err)
        } else {
            throw err
        }
    }
})

apiRoute("POST /auth/login", async (req) => {
    const user = await select(t.type({
        id: t.number,
        password: t.string,
    }), sql`
        SELECT id, password
        FROM Users WHERE username=${req.username}
    `)

    const ok = await bcrypt.compare(req.password, user.password)
    if (!ok) throw new Error("bad password")

    const uuid = uuidv4()
    const result = await run(sql`
        INSERT INTO Sessions (userId, device, uuid)
        VALUES (${user.id}, ${req.device}, ${uuid})
    `)

    const sessionId = result.lastID
    if (sessionId === undefined) throw new Error("failed to insert session")

    return {
        token: signJwt({
            userId: user.id,
            sessionId,
        })
    }
})

apiRouteAuth("POST /auth/logout", async (req, user) => {
    const result = await run(sql`
        DELETE FROM Sessions
        WHERE id=${user.sessionId}
    `)
    return { ok: result.changes !== undefined && result.changes > 0 }
})

apiRouteAuth("GET /auth/sessions", async (req, user) => {
    const sessions = await selectAll(t.type({
        uuid: t.string,
        device: t.string,
    }), sql`
        SELECT uuid, device
        FROM Sessions
        WHERE userId=${user.userId}
    `)
    return { sessions }
})

apiRouteAuth("DELETE /auth/sessions", async (req, user) => {
    const result = await run(sql`
        DELETE FROM Sessions
        WHERE userId=${user.userId}
    `)
    return { count: result.changes ?? 0 }
})

apiRouteAuth("DELETE /auth/sessions/:uuid", async (req, user) => {
    const result = await run(sql`
        DELETE FROM Sessions
        WHERE userId=${user.userId} AND uuid=${req.uuid}
    `)
    return { ok: result.changes !== undefined && result.changes > 0 }
})
