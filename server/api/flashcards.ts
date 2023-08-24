import { ApiUser, apiRouteAuth } from "../utils/api"
import * as t from "io-ts"
import sql from "sql-template-strings"
import { db } from "../utils/database"
import stringify from "json-stable-stringify"
import { v4 as uuidv4 } from "uuid"

function getTime(): number {
    return Date.now()
}

apiRouteAuth("POST /flashcards", async (req, user) => {
    const infoJson = stringify(req.data)
    const uuid = uuidv4()

    await db.transact(async (db) => {
        const { id: infoId } = await db.select(t.type({
            id: t.number,
         }), sql`
            INSERT INTO FlashcardInfo(info, refcount)
                VALUES (${infoJson}, 1)
            ON CONFLICT(info)
                DO UPDATE SET refcount = FlashcardInfo.refcount + 1
            RETURNING
                FlashcardInfo.id AS id
        `)

        const existingResult = await db.selectOptional(t.type({
            infoId: t.number,
        }), sql`
            SELECT infoId
            FROM Flashcard
            WHERE userId=${user.userId} AND word=${req.word}
        `)

        const existingInfoId = existingResult?.infoId ?? null
        if (existingInfoId !== null) {
            await db.run(sql`
                UPDATE Flashcard
                SET infoId=${infoId}, example=${req.example}
                WHERE userId=${user.userId} AND word=${req.word}
            `)

            await db.run(sql`
                UPDATE FlashcardInfo
                SET refcount = refcount - 1
                WHERE id=${existingInfoId}
            `)

            await db.run(sql`
                DELETE FROM FlashcardInfo
                WHERE id=${existingInfoId} AND refcount=0
            `)

        } else {
            const time = getTime()
            await db.run(sql`
                INSERT INTO Flashcard(uuid, userId, word, example, infoId, addedTime)
                    VALUES (${uuid}, ${user.userId}, ${req.word}, ${req.example}, ${infoId}, ${time})
            `)
        }
    })

    return { uuid }
})

apiRouteAuth("GET /flashcards", async (req, user) => {
    const results = await db.selectAll(t.type({
        word: t.string,
        example: t.string,
        uuid: t.string,
        addedTime: t.number,
        answerTime: t.number,
        answerHistory: t.number,
        answersTotal: t.number,
        answersCorrect: t.number,
    }), sql`
        SELECT word, example, uuid, addedTime, answerTime, answerHistory, answersTotal, answersCorrect
        FROM Flashcard
        WHERE userId=${user.userId}
        ORDER BY addedTime
    `)

    return { results }
})

apiRouteAuth("GET /flashcards/:uuid", async (req, user) => {
    const result = await db.select(t.type({
        word: t.string,
        example: t.string,
        uuid: t.string,
        addedTime: t.number,
        answerTime: t.number,
        answerHistory: t.number,
        answersTotal: t.number,
        answersCorrect: t.number,
        info: t.string,
    }), sql`
        SELECT word, example, uuid, addedTime, answerTime, answerHistory, answersTotal, answersCorrect, FlashcardInfo.info AS info
        FROM Flashcard
        INNER JOIN FlashcardInfo ON FlashcardInfo.id=Flashcard.infoId
        WHERE userId=${user.userId} AND uuid=${req.uuid}
    `)

    const info = JSON.parse(result.info)
    return {
        ...result,
        info,
    }
})

apiRouteAuth("POST /flashcards/:uuid/answer", async (req, user) => {
    const time = getTime()
    const answerBit = req.correct ? 1 : 0
    const result = db.select(t.type({
        answerTime: t.number,
        answerHistory: t.number,
        answersTotal: t.number,
        answersCorrect: t.number,
    }), sql`
        UPDATE Flashcard
        SET
            answerTime = ${time},
            answerHistory = ((answerHistory << 1) & 0xffffffff) | ${answerBit},
            answersTotal = answersTotal + 1,
            answersCorrect = answersCorrect + ${answerBit}
        WHERE 
            userId=${user.userId} AND uuid=${req.uuid}
        RETURNING
            answerTime, answerHistory, answersTotal, answersCorrect
    `)

    return result
})

apiRouteAuth("DELETE /flashcards/:uuid", async (req, user) => {
    await db.transact(async (db) => {
        const { infoId } = await db.select(t.type({
            infoId: t.number,
        }), sql`
            DELETE FROM Flashcard
            WHERE userId=${user.userId} AND uuid=${req.uuid}
            RETURNING infoId
        `)

        await db.run(sql`
            UPDATE FlashcardInfo
            SET refcount = refcount - 1
            WHERE id=${infoId}
        `)

        await db.run(sql`
            DELETE FROM FlashcardInfo
            WHERE id=${infoId} AND refcount=0
        `)
    })

    return { }
})


