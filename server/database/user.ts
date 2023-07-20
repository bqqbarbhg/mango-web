import { db } from "../utils/database"
import sql from "sql-template-strings"

type User = {
    id: string,
    username: string,
    password: string,
    settings: string,
}

export async function addUser(info: { username: string, password: string }) {
    await db.run(sql`
        INSERT INTO Users (username, password)
        VALUES (${info.username}, ${info.password})
    `)
}

export async function getUserById(query: { id: string }) {
    return db.get<User>(sql`
        SELECT *
        FROM Users
        WHERE id=${query.id}
    `)
}


export async function getUserByName(query: { name: string }) {
    return db.get<User>(sql`
        SELECT *
        FROM Users
        WHERE name=${query.name}
    `)
}
