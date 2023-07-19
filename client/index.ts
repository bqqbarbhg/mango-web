import ImageView from "./reader/image-view"

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

render()
