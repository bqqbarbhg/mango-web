import sqlite3 from "sqlite3"
import { Database, open, ISqlite } from "sqlite"
import type { TypeOf, Type } from "io-ts"
import { SQLStatement } from "sql-template-strings"

export type DB = Database<sqlite3.Database, sqlite3.Statement>
export let db: DB

export async function setupDatabase(options: {
    databasePath?: string,
} = { }) : Promise<DB> {
    sqlite3.verbose()

    db = await open({
        filename: options.databasePath ?? "build/database.db",
        driver: sqlite3.Database,
    })

    await db.migrate({
        migrationsPath: "./server/migrations",
    })

    return db
}

export function run(sql: SQLStatement): Promise<ISqlite.RunResult> {
    return db.run(sql)
}

export async function select<A, O, I>(t: Type<A, O, I>, sql: SQLStatement): Promise<A> {
    const row = await db.get(sql)
    if (!row) throw new Error("failed to find row")
    const result = t.decode(row)
    if (result._tag === "Right") {
        return result.right
    } else {
        console.error(result.left)
        throw new Error("internal validation error")
    }
}

export async function selectOptional<A, O, I>(t: Type<A, O, I>, sql: SQLStatement): Promise<A | null> {
    const row = await db.get(sql)
    if (!row) return null
    const result = t.decode(row)
    if (result._tag === "Right") {
        return result.right
    } else {
        console.error(result.left)
        throw new Error("internal validation error")
    }
}

export async function selectAll<A, O, I>(t: Type<A, O, I>, sql: SQLStatement): Promise<A[]> {
    const rows = await db.all(sql) ?? []
    return rows.map(row => {
        const result = t.decode(row)
        if (result._tag === "Right") {
            return result.right
        } else {
            console.error(result.left)
            throw new Error("internal validation error")
        }
    })
}
