import { addUser, getUserById } from "./database/user"
import { Router } from "express"
import { apiRoute } from "./utils/api"

const r = Router()

apiRoute(r, "POST /users", async (req) => {
    await addUser(req)
    return { }
})

apiRoute(r, "GET /users/:id", async (req) => {
    const user = await getUserById({ id: req.id })
    if (!user) throw new Error("user not found")
    return { name: user.username }
})

export default r
