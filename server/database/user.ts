import { db } from "../utils/database"
import sql from "sql-template-strings"

type User = {
    id: string,
    username: string,
    password: string,
    settings: string,
}

export async function addUser(info: { username: string, password: string, jwtKey: string }) {
    await db.run(sql`
        INSERT INTO Users (username, password, jwtKey)
        VALUES (${info.username}, ${info.password}, ${info.jwtKey})
    `)
}

export async function getUserById(id: string) {
    const user = await db.get<User>(sql`
        SELECT id, username, password, settings
        FROM Users
        WHERE id=${id}
    `)
    if (!user) throw new Error(`could not find user by id: ${id}`)
    return user
}

export async function getUserByName(name: string) {
    const user = await db.get<User>(sql`
        SELECT id, username, password, settings
        FROM Users
        WHERE username=${name}
    `)
    if (!user) throw new Error(`could not find user by name: ${name}`)
    return user
}

export async function getUserJwtKeyById(id: string) {
    const row = await db.get<{ jwtKey: string }>(sql`
        SELECT jwtKey
        FROM Users
        WHERE id=${id}
    `)
    return row?.jwtKey ?? null
}
