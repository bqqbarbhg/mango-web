import ImageView from "./reader/image-view"
import { apiCall, setApiToken } from "./utils/api"
import { createState, render, useState } from "kaiku"

const globalState = createState({
    apiToken: "",
})

async function testSettings() {
    try {
        const settings = await apiCall("GET /user/settings", { })
        console.log(settings)
    } catch (e) {
        console.error(e)
    }
}
testSettings()

function IndexTop() {
    const state = useState({
        username: "",
        password: "",
        pending: false,
    })

    const register = async (e: any) => {
        e.preventDefault()
        try {
            state.pending = true
            const result = await apiCall("POST /users", {
                username: state.username,
                password: state.password,
            })
            console.log(result)
            globalState.apiToken = result.token
            setApiToken(result.token)

            const settings = await apiCall("GET /user/settings", { })
            console.log(settings)
        } catch (e) {
            console.error(e)
        } finally {
            state.pending = false
        }
    }

    return <>
        <h1>{globalState.apiToken}</h1>
        <form onSubmit={register}>
            <div>
                <label for="username">Username</label>
                <input type="text" id="username" name="username" disabled={state.pending}
                    value={() => state.username} onInput={(e: any) => state.username = e.target.value } />
            </div>
            <div>
                <label for="password">Password</label>
                <input type="password" id="password" name="password" disabled={state.pending}
                    value={() => state.password} onInput={(e: any) => state.password = e.target.value } />
            </div>
            <div>
                <input type="submit" value="Register" />
            </div>
        </form>
    </>
}

const kaikuRoot = document.getElementById("kaiku-root")
if (!kaikuRoot) throw new Error("could not find root")
render(<IndexTop />, kaikuRoot, globalState)

/*

const parent = document.querySelector("#main-parent") as HTMLElement
const canvas = document.querySelector("#main-canvas") as HTMLCanvasElement
const imageView = new ImageView(parent, canvas)

canvas.addEventListener("touchstart", (e) => {
    e.preventDefault()
})

canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault()
})

let targetX = 0
let targetY = 0

const image = new Image()
image.addEventListener("load", (e) => {
    imageView.setImage(image)
})
image.src = "test-image.png"

canvas.addEventListener("pointermove", (e) => {
    e.preventDefault()

    targetX = e.clientX / 600 * 2 - 1.0
    targetY = e.clientY / 600 * -2 + 1.0
})

function render() {
    const alpha = 0.5
    imageView.x = targetX*alpha + imageView.x*(1.0 - alpha)
    imageView.y = targetY*alpha + imageView.y*(1.0 - alpha)
    imageView.render()

    window.requestAnimationFrame(render)
}

async function test() {
    try {
        await apiCall("POST /users", {
            username: "test-user",
            password: "test-pass",
        })
    } catch (err) {
        console.error(err)
    }

    const result = await apiCall("GET /users/:id", {
        id: "1"
    })
    console.log(result)
}
test()

render()

*/
