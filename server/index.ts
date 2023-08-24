import express from "express"
import { setupDatabase } from "./utils/database"
import { parseArgs } from "node:util"
import "./api"
import { apiRouter } from "./utils/api"
import { RequestHandler } from "express"

async function main() {
    const { values: args } = parseArgs({
        options: {
            db: { type: "string" },
            forceMigration: { type: "boolean" },
        }
    })

    setupDatabase({
        databasePath: args.db,
        forceMigration: args.forceMigration,
    })

    const app = express()

    const notFound: RequestHandler = (_, res) => {
        res.status(404)
        res.json({ error: "not found" })
    }

    apiRouter.all("*", notFound)

    app.use(express.static("build"))
    app.use(express.static("static"))
    app.use(express.json())
    app.use("/api", apiRouter)

    const htmlPaths = [
        "/", "/read/*", "/register", "/settings", "/settings/*",
        "/flashcards", "/flashcards/",
    ]
    for (const path of htmlPaths) {
        app.use(path, express.static("static/index.html"))
    }

    const port = 5000
    app.listen(port, () => {
        console.log(`Listening on ${port}`)
    })
}

main()
