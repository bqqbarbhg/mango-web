import sqlite3 from "sqlite3"
import { Database, open } from "sqlite"

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
