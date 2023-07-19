import express from "express"

const app = express()

app.use(express.static("build"))
app.use(express.static("static"))

const port = 5000
app.listen(port, () => {
    console.log(`Listening on ${port}`)
})
