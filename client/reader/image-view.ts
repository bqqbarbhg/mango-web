import { GraphicsContext, UniformBind } from "./graphics"
import type { UniformBinds } from "./graphics"

import vertexShader from "./shader/vertex.glsl"
import fragmentShader from "./shader/fragment.glsl"

export default class ImageView {
    parentElement: Element
    canvas: HTMLCanvasElement

    gl: WebGL2RenderingContext
    gfx: GraphicsContext

    texture: WebGLTexture | null

    mainShader: WebGLProgram
    mainBinds: UniformBinds

    x: number
    y: number

    constructor(parent: HTMLElement, canvas: HTMLCanvasElement) {
        const observer = new ResizeObserver(this.onParentResized)
        observer.observe(parent)

        this.parentElement = parent
        this.canvas = canvas

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
            mainTexture: UniformBind.texture2d,
        })
        
        this.x = 0
        this.y = 0
    }

    onParentResized = () => {
        const { canvas, parentElement } = this

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
        // gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, image.width, image.height, gl.RGBA, gl.UNSIGNED_BYTE, image)
        gl.generateMipmap(gl.TEXTURE_2D)

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        
        this.texture = texture
    }

    render() {
        const { gl, gfx } = this

        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT)

        gl.useProgram(this.mainShader)
        gfx.applyBinds(this.mainBinds, {
            basePosition: { x: this.x, y: this.y },
            mainTexture: this.texture,
        })
        gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

}
