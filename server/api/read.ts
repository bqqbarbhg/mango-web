import { ApiUser, apiRouteAuth } from "../utils/api"
import * as t from "io-ts"
import sql from "sql-template-strings"
import { run, select, selectAll, selectOptional } from "../utils/database"
import { v4 as uuidv4 } from "uuid"
import apiRoutes from "../../common/api-routes"

type PostReq = t.TypeOf<typeof apiRoutes["POST /read/:*path"]["req"]>;
async function tryUpdate(req: PostReq, user: ApiUser): Promise<boolean> {
    let sourceId: number | null = null
    if (req.sourceUuid) {
        const result = await selectOptional(t.type({ id: t.number }), sql`
            SELECT id FROM Sources WHERE uuid=${req.sourceUuid}
        `)
        if (result !== null) {
            sourceId = result.id
        }
    }

    if (sourceId !== null) {
        const result = await run(sql`
            UPDATE VolumeState SET
                latestPage = ${req.page},
                latestSessionId = ${user.userId},
                latestSourceId = ${sourceId}
            WHERE userId=${user.userId} AND path=${req.path}
        `)
        return (result.changes ?? 0) > 0
    } else {
        const result = await run(sql`
            UPDATE VolumeState SET
                latestPage = ${req.page},
                latestSessionId = ${user.userId}
            WHERE userId=${user.userId} AND path=${req.path}
        `)
        return (result.changes ?? 0) > 0
    }
}

apiRouteAuth("POST /read/:*path", async (req, user) => {
    let result = await tryUpdate(req, user)
    if (!result) {
        await run(sql`
            INSERT INTO VolumeState (userId, path)
            VALUES (${user.userId}, ${req.path})
        `)
        result = await tryUpdate(req, user)
    }

    const page = req.page
    const maxPages = 4096

    if (page > 0 && page < maxPages) {
        const zeroPage = page - 1
        const pageBase = Math.floor(zeroPage / 32)
        const pageBit = 1 << (zeroPage % 32)

        const { id: volumeId } = await select(t.type({ id: t.number }), sql`
            SELECT id
            FROM VolumeState
            WHERE userId=${user.userId} AND path=${req.path}
        `)

        await run(sql`
            INSERT INTO ReadPages(volumeId, pageBase, pageBits)
                VALUES (${volumeId}, ${pageBase}, ${pageBit})
            ON CONFLICT(volumeId, pageBase)
                DO UPDATE SET pageBits = ReadPages.pageBits | ${pageBit}
        `)
    }

    return { ok: result }
})

apiRouteAuth("GET /read/:*path", async (req, user) => {
    const row = await selectOptional(t.type({
        sourceUuid: t.union([t.string, t.null]),
        sourceUrl: t.union([t.string, t.null]),
        page: t.union([t.number, t.null]),
        volumeId: t.union([t.number, t.null]),
    }), sql`
        SELECT
            Sources.uuid AS sourceUuid,
            Sources.url AS sourceUrl,
            VolumeState.latestPage AS page,
            VolumeState.id AS volumeId
        FROM VolumeState
        LEFT JOIN Sources ON Sources.id=VolumeState.latestSourceId
        WHERE VolumeState.userId=${user.userId} AND VolumeState.path=${req.path}
    `)
    if (!row) return { result: null }

    const readPages = []
    if (row.volumeId !== null) {
        const pageRows = await selectAll(t.type({
            pageBase: t.number,
            pageBits: t.number,
        }), sql`
            SELECT pageBase, pageBits
            FROM ReadPages
            WHERE volumeId=${row.volumeId}
        `)

        for (const pageRow of pageRows) {
            while (readPages.length <= pageRow.pageBase) {
                readPages.push(0)
            }
            readPages[pageRow.pageBase] = pageRow.pageBits
        }
    }

    const source = row.sourceUrl && row.sourceUuid
        ? { url: row.sourceUrl, uuid: row.sourceUuid } : null
    return { result: { source, page: row.page, readPages } }
})
