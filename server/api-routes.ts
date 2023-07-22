
/*
import { addUser, getUserById, getUserByName } from "./database/user"
import { Router } from "express"
import { apiRoute, apiRouteAuth } from "./utils/api"
import bcrypt from "bcrypt"
import { generateJwtKey, signJwtToken } from "./utils/auth"

const r = Router()

/*

apiRoute(r, "POST /users", async (req) => {
    const passwordHash = await bcrypt.hash(req.password, 10)

    await addUser({
        username: req.username,
        password: passwordHash,
        jwtKey: generateJwtKey(),
    })

    const user = await getUserByName(req.username)
    return {
        token: await signJwtToken(user.id, { id: user.id, username: user.username }),
    }
})

apiRoute(r, "POST /login", async (req) => {
    const user = await getUserByName(req.username)
    const passwordOk = bcrypt.compare(req.password, user.password)
    if (!passwordOk) throw new Error("bad password")

    return {
        token: await signJwtToken(user.id, { id: user.id, username: user.username }),
    }
})

apiRoute(r, "GET /users/:id", async (req) => {
    const user = await getUserById(req.id)
    if (!user) throw new Error("user not found")
    return { name: user.username }
})

apiRouteAuth(r, "GET /user/settings", async (req, user) => {
    const userInfo = await getUserById(user.id)
    return { test: "ship it" }
})


export default r
*/
