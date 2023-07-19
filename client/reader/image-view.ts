import { GraphicsContext, UniformBind } from "./graphics"
import type { UniformBinds } from "./graphics"

import vertexShader from "./shader/vertex.glsl"
import fragmentShader from "./shader/fragment.glsl"

export default class ImageView {
    parentElement: HTMLElement
    canvas: HTMLCanvasElement

    gl: WebGL2RenderingContext
    gfx: GraphicsContext

    texture: WebGLTexture | null

    mainShader: WebGLProgram
    mainBinds: UniformBinds

    renderWidth: number = 0
    renderHeight: number = 0

    x: number = 0
    y: number = 0

    constructor(parent: HTMLElement, canvas: HTMLCanvasElement) {
        this.parentElement = parent
        this.canvas = canvas

        const observer = new ResizeObserver(this.onParentResized)
        observer.observe(parent)

        this.onParentResized()

        const gl = canvas.getContext("webgl2", {
            alpha: false,
            desynchronized: true,
            powerPreference: "low-power",
        })
        if (!gl) throw new Error("Failed to create webgl2 context")

        const gfx = new GraphicsContext(gl)

        this.gl = gl
        this.gfx = gfx

        this.mainShader = gfx.compileProgram(vertexShader, fragmentShader)
        this.mainBinds = gfx.createUniformBinds(this.mainShader, {
            basePosition: UniformBind.vec2,
            quadScale: UniformBind.vec2,
            mainTexture: UniformBind.texture2d,
        })
    }

    onParentResized = () => {
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

        this.renderWidth = renderWidth
        this.renderHeight = renderHeight
    }

    setImage(image: HTMLImageElement) {
        const { gl, gfx } = this

        if (this.texture !== null) {
            gl.deleteTexture(this.texture)
        }

        let extent = 1
        let mips = 1
        while (extent < Math.max(image.width, image.height)) {
            extent *= 2
            mips += 1
        }

        const canvas = document.createElement("canvas")
        canvas.width = extent
        canvas.height = extent
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(image, 0, 0)

        const texture = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, canvas)
        gl.generateMipmap(gl.TEXTURE_2D)

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        
        this.texture = texture
    }

    render() {
        const { gl, gfx } = this

        gl.viewport(0, 0, this.renderWidth, this.renderHeight)

        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT)

        gl.useProgram(this.mainShader)
        gfx.applyBinds(this.mainBinds, {
            basePosition: { x: this.x, y: this.y },
            quadScale: { x: 1.0, y: 1.0 },
            mainTexture: this.texture,
        })
        gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

}
