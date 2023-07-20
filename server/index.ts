import express from "express"
import { setupDatabase } from "./utils/database"
import { parseArgs } from "node:util"
import apiRouter from "./api-routes"

async function main() {
    const { values: args } = parseArgs({
        options: {
            db: { type: "string" },
        }
    })

    setupDatabase({
        databasePath: args.db,
    })

    const app = express()

    app.use(express.static("build"))
    app.use(express.static("static"))
    app.use(express.json())
    app.use("/api", apiRouter)

    const port = 5000
    app.listen(port, () => {
        console.log(`Listening on ${port}`)
    })
}

main()
