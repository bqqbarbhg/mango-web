import ImageView from "./image-view"

export default class ImageViewCanvas extends ImageView {
    parentElement: HTMLElement
    canvas: HTMLCanvasElement

    ctx: CanvasRenderingContext2D

    image: HTMLImageElement | null

    canvasWidth: number = 0
    canvasHeight: number = 0
    renderWidth: number = 0
    renderHeight: number = 0
    imageWidth: number = 0
    imageHeight: number = 0

    constructor(parent: HTMLElement) {
        super()

        const canvas = document.createElement("canvas")
        parent.appendChild(canvas)

        this.parentElement = parent
        this.canvas = canvas

        const ctx = canvas.getContext("2d", {
            alpha: false,
            powerPreference: "low-power",
        }) as CanvasRenderingContext2D
        if (!ctx) throw new Error("Failed to create 2d context")

        this.ctx = ctx
    }

    dispose() {
        this.canvas.remove()
    }

    parentResized() {
        const { canvas, parentElement } = this

        const parentWidth = parentElement.offsetWidth
        const parentHeight = parentElement.offsetHeight
        const ratio = window.devicePixelRatio

        const canvasWidth = Math.floor(parentWidth)
        const canvasHeight = Math.floor(parentHeight)
        const renderWidth = Math.floor(canvasWidth * ratio)
        const renderHeight = Math.floor(canvasHeight * ratio)

        canvas.width = renderWidth
        canvas.height = renderHeight
        canvas.style.width = `${canvasWidth}px`
        canvas.style.height = `${canvasHeight}px`

        this.canvasWidth = canvasWidth
        this.canvasHeight = canvasHeight
        this.renderWidth = renderWidth
        this.renderHeight = renderHeight
    }

    setImage(image: HTMLImageElement) {
        this.image = image
        this.imageWidth = image.width
        this.imageHeight = image.height
        console.log(image)
    }

    render() {
        const { ctx } = this

        ctx.resetTransform()
        ctx.fillStyle = "#000"
        ctx.fillRect(0, 0, this.renderWidth, this.renderHeight)


        if (this.image) {
            const ratio = window.devicePixelRatio
            const scale = this.viewport.scale * ratio
            ctx.setTransform(scale, 0, 0, scale, this.viewport.x * ratio, this.viewport.y * ratio)
            ctx.drawImage(this.image, 0, 0)
        }
    }
}

