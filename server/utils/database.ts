import sqlite3 from "sqlite3"
import { Database, open, ISqlite } from "sqlite"
import type { TypeOf, Type } from "io-ts"
import sql, { SQLStatement } from "sql-template-strings"
import { globalOptions } from "./options"

export type InternalDB = Database<sqlite3.Database, sqlite3.Statement>
export let db: DB

class Pool {
    path: string
    newConnectionsLeft: number
    waitQueue: ((db: DB) => void)[] = []
    freeConnections: DB[] = []

    constructor(path: string, capacity: number) {
        this.path = path
        this.newConnectionsLeft = capacity
    }

    async acquire(): Promise<DB> {
        if (this.freeConnections.length > 0) {
            return Promise.resolve(this.freeConnections.pop()!)
        }

        if (this.newConnectionsLeft > 0) {
            this.newConnectionsLeft -= 1
            const internalDB = await open({
                filename: this.path,
                driver: sqlite3.Database,
            })
            return Promise.resolve(new DB(internalDB))
        }

        return new Promise((resolve, _) => {
            this.waitQueue.push(resolve)
        })
    }

    release(db: DB) {
        if (this.waitQueue.length > 0) {
            const fn = this.waitQueue.shift()!
            fn(db)
        } else {
            this.freeConnections.push(db)
        }
    }
}

let pool: Pool

export async function setupDatabase(options: {
    databasePath?: string,
    poolCapacity?: number,
    forceMigration?: boolean,
} = { }) : Promise<DB> {
    sqlite3.verbose()

    const path = options.databasePath ?? `${globalOptions.root}/database.db`
    const internalDB = await open({
        filename: path,
        driver: sqlite3.Database,
    })

    await internalDB.migrate({
        migrationsPath: "./server/migrations",
        force: options.forceMigration ?? false,
    })

    pool = new Pool(path, options.poolCapacity ?? 8)

    db = new DB(internalDB)
    return db
}

export class DB {
    db: InternalDB

    constructor(internalDB: InternalDB) {
        this.db = internalDB
    }

    run(sql: SQLStatement): Promise<ISqlite.RunResult> {
        const { db } = this
        return db.run(sql)
    }

    async select<A, O, I>(t: Type<A, O, I>, sql: SQLStatement): Promise<A> {
        const { db } = this
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

    async selectOptional<A, O, I>(t: Type<A, O, I>, sql: SQLStatement): Promise<A | null> {
        const { db } = this
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

    async selectAll<A, O, I>(t: Type<A, O, I>, sql: SQLStatement): Promise<A[]> {
        const { db } = this
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

    async connect<T>(fn: (db: DB) => Promise<T>): Promise<T> {
        let db: DB | null = null
        let result: T
        try {
            db = await pool.acquire()
            result = await fn(db)
        } finally {
            if (db) {
                pool.release(db)
            }
        }
        return result
    }

    transact<T>(fn: (db: DB) => Promise<T>): Promise<T> {
        return this.connect(async (db) => {
            let result: T
            try {
                db.run(sql`BEGIN`)
                result = await fn(db)
                db.run(sql`COMMIT`)
            } catch (err) {
                db.run(sql`ROLLBACK`)
                throw err
            }
            return result
        })
    }
}
