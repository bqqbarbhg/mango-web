import { GraphicsContext, TextureFormat, UniformBind } from "./graphics"
import type { UniformBinds } from "./graphics"

import baseVS from "./shader/base-vs.glsl"
import baseFS from "./shader/base-fs.glsl"
import highlightVS from "./shader/highlight-vs.glsl"
import highlightFS from "./shader/highlight-fs.glsl"

import ImageView, { ImageViewHighlight, ImageViewImage, ImageViewScene } from "./image-view"
import { KtxFile } from "../utils/ktx"
import { MipCache } from "./mip-cache"

type PageTexture = {
    mipMin: number
    mipMax: number
    uvScale: { x: number, y: number }
    texture: WebGLTexture
    lruSerial: number
}

function getTime() {
    return performance.now() * 1e-3
}

export default class ImageViewWebGL extends ImageView {
    parentElement: HTMLElement
    canvas: HTMLCanvasElement
    textureCache = new Map<number, PageTexture>()

    gl: WebGL2RenderingContext
    gfx: GraphicsContext

    texture: WebGLTexture | null
    whiteTexture: WebGLTexture

    mainShader: WebGLProgram
    mainBinds: UniformBinds

    highlightShader: WebGLProgram
    highlightBinds: UniformBinds

    highlightTexture: WebGLTexture | null = null
    highlightQuad: {
        x: number
        y: number
        w: number
        h: number
        uvX: number
        uvY: number
        unitPerPx: number
    } | null = null
    highlightTime: number

    canvasWidth: number = 0
    canvasHeight: number = 0
    renderWidth: number = 0
    renderHeight: number = 0
    imageWidth: number = 0
    imageHeight: number = 0
    textureWidth: number = 0
    textureHeight: number = 0
    ext: {
        rgtc: EXT_texture_compression_rgtc | null
        etc: WEBGL_compressed_texture_etc | null
    }

    lruSerial: number = 0

    constructor(parent: HTMLElement) {
        super()

        const canvas = document.createElement("canvas")
        parent.appendChild(canvas)

        this.parentElement = parent
        this.canvas = canvas

        const gl = canvas.getContext("webgl2", {
            alpha: false,
            desynchronized: false,
            powerPreference: "low-power",
        })
        if (!gl) throw new Error("Failed to create webgl2 context")

        const gfx = new GraphicsContext(gl)

        this.gl = gl
        this.gfx = gfx

        this.ext = {
            rgtc: gl.getExtension("EXT_texture_compression_rgtc"),
            etc: gl.getExtension("WEBGL_compressed_texture_etc"),
        }

        this.mainShader = gfx.compileProgram(baseVS, baseFS)
        this.mainBinds = gfx.createUniformBinds(this.mainShader, {
            basePosition: UniformBind.vec2,
            quadScale: UniformBind.vec2,
            uvScale: UniformBind.vec2,
            mainTexture: UniformBind.texture2d,
            fadeAmount: UniformBind.float,
        })

        this.highlightShader = gfx.compileProgram(highlightVS, highlightFS)
        this.highlightBinds = gfx.createUniformBinds(this.highlightShader, {
            basePosition: UniformBind.vec2,
            quadScale: UniformBind.vec2,
            uvScale: UniformBind.vec2,
            sharpness: UniformBind.float,
            color: UniformBind.vec4,
            gridTexture: UniformBind.texture2d,
        })

        const whitePixel = new Uint8Array([0xff, 0xff, 0xff, 0xff])

        this.whiteTexture = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, this.whiteTexture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, whitePixel)
    }

    dispose() {
        const { gl } = this
        gl.deleteTexture(this.texture)
        gl.deleteProgram(this.mainShader)
        this.canvas.remove()
    }

    getImageFormat() {
        if (this.ext.etc) {
            return "eac"
        } else if (this.ext.rgtc) {
            return "bc4"
        } else {
            return super.getImageFormat()
        }
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

        this.render()
    }

    setupPageTexture(image: ImageViewImage) {
        const { gl, mipCache } = this
        if (!mipCache) return

        const scale = image.scale
        const width = this.renderWidth / this.canvasWidth * scale
        const height = this.renderHeight / this.canvasHeight * scale
        const mip = Math.min(Math.max(-Math.log2(Math.max(width, height)), 0), 3)
        const minMip = Math.round(mip)

        const index = image.pageIndex
        const mipPage = mipCache.getMipPage(index, minMip)
        const mipData = mipPage.mipData
        let mipMin = -1
        let mipMax = -1
        for (let i = 0; i < mipData.length; i++) {
            if (mipData[i] !== null) {
                mipMin = i
                break
            }
        }
        if (mipMin >= 0) {
            for (mipMax = mipMin; mipMax < mipData.length; mipMax++) {
                if (mipData[mipMax] === null) break
            }
        }

        let needUpdate = false
        let prevTexture = this.textureCache.get(index)
        if (prevTexture) {
            prevTexture.lruSerial = ++this.lruSerial
            if (prevTexture.mipMin !== mipMin || prevTexture.mipMax !== mipMax) {
                needUpdate = true
            }
        } else {
            needUpdate = true
        }

        if (!needUpdate) return

        if (prevTexture?.texture && prevTexture.texture !== this.whiteTexture) {
            gl.deleteTexture(prevTexture.texture)
        }

        const lruSerial = ++this.lruSerial
        if (mipMin >= 0) {
            const topMip = mipData[mipMin]!
            let extent = 1
            let mips = 1
            while (extent < Math.max(topMip.width, topMip.height)) {
                extent *= 2
                mips += 1
            }

            const texture = gl.createTexture()!
            gl.bindTexture(gl.TEXTURE_2D, texture)

            const mipAmount = mipMax - mipMin
            const internalFormat = topMip.format
            gl.texStorage2D(
                gl.TEXTURE_2D, mipAmount,
                internalFormat, extent, extent)

            for (let mipI = 0; mipI < mipAmount; mipI++) {
                const mip = mipData[mipMin + mipI]!
                gl.compressedTexSubImage2D(
                    gl.TEXTURE_2D,
                    mipI,
                    0, 0,
                    mip.width, mip.height,
                    internalFormat,
                    mip.data)
            }

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

            const topExtent = extent << mipMin
            const uvScale = {
                x: image.imageWidth / topExtent,
                y: image.imageHeight / topExtent,
            }

            this.textureCache.set(index, { mipMin, mipMax, texture, uvScale, lruSerial })
        } else {
            this.textureCache.set(index, {
                mipMin, mipMax, lruSerial,
                uvScale: { x: 1, y: 1 },
                texture: this.whiteTexture
            })
        }

        const maxTextures = 32
        if (this.textureCache.size > maxTextures) {
            let minSerial = this.lruSerial
            let minKey = null
            for (const [key, val] of this.textureCache.entries()) {
                if (val.lruSerial < minSerial) {
                    minSerial = val.lruSerial
                    minKey = key
                }
            }
            if (minKey !== null) {
                const entry = this.textureCache.get(minKey)!
                gl.deleteTexture(entry.texture)
                this.textureCache.delete(minKey)
            }
        }
    }

    setHighlights(highlights: ImageViewHighlight[]) {
        const { gl, gfx } = this

        gl.deleteTexture(this.highlightTexture)
        this.highlightQuad = null
        this.highlightTime = getTime()

        if (highlights.length > 0) {
            let minX = +Infinity
            let minY = +Infinity
            let maxX = -Infinity
            let maxY = -Infinity
            for (const highlight of highlights) {
                minX = Math.min(minX, highlight.x)
                minY = Math.min(minY, highlight.y)
                maxX = Math.max(maxX, highlight.x + highlight.w)
                maxY = Math.max(maxY, highlight.y + highlight.h)
            }

            const padding = 32
            const defaultGridCell = 16

            let gridCell = 0
            let gridBaseX = 0
            let gridBaseY = 0
            let gridSizeX = 0
            let gridSizeY = 0

            const gridMaxSize = 1024

            do {
                gridCell = gridCell ? gridCell + 8 : defaultGridCell
                gridBaseX = Math.floor((minX - padding) / gridCell)
                gridBaseY = Math.floor((minY - padding) / gridCell)
                gridSizeX = Math.ceil((maxX + padding - gridBaseX * gridCell) / gridCell + 1)
                gridSizeY = Math.ceil((maxY + padding - gridBaseY * gridCell) / gridCell + 1)
            } while (gridSizeX * gridSizeY >= gridMaxSize)

            const texSizeX = (gridSizeX + 3) & ~3
            const texSizeY = (gridSizeY + 3) & ~3

            const grid = new Uint8Array(texSizeX * texSizeY)
            grid.fill(255)

            const distanceScale = 256 / gridCell / 8
            for (const highlight of highlights) {
                const x0 = Math.min(Math.max(Math.floor((highlight.x - padding) / gridCell) - gridBaseX, 0), gridSizeX - 1)
                const y0 = Math.min(Math.max(Math.floor((highlight.y - padding) / gridCell) - gridBaseY, 0), gridSizeY - 1)
                const x1 = Math.min(Math.max(Math.ceil((highlight.x + highlight.w + padding) / gridCell) - gridBaseX, 0), gridSizeX - 1)
                const y1 = Math.min(Math.max(Math.ceil((highlight.y + highlight.h + padding) / gridCell) - gridBaseY, 0), gridSizeY - 1)

                const minX = highlight.x
                const minY = highlight.y
                const maxX = highlight.x + highlight.w
                const maxY = highlight.y + highlight.h

                for (let y = y0; y <= y1; y++) {
                    for (let x = x0; x <= x1; x++) {
                        const gridX = (x + gridBaseX) * gridCell
                        const gridY = (y + gridBaseY) * gridCell
                        const dX = Math.max(minX - gridX, gridX - maxX)
                        const dY = Math.max(minY - gridY, gridY - maxY)
                        const aX = Math.max(0.0, dX)
                        const aY = Math.max(0.0, dY)
                        const a = Math.sqrt(aX*aX + aY*aY)
                        const b = Math.min(0.0, Math.max(dX, dY))
                        const dist = a + b

                        const normalizedDist = Math.min(Math.max(128 + dist * distanceScale, 0), 255)
                        const ix = y * texSizeX + x
                        grid[ix] = Math.min(grid[ix]!, Math.round(normalizedDist))
                    }
                }
            }

            this.highlightTexture = gfx.createTexture(TextureFormat.r8, texSizeX, texSizeY, grid)
            this.highlightQuad = {
                x: gridBaseX * gridCell,
                y: gridBaseY * gridCell,
                w: (gridSizeX - 0) * gridCell,
                h: (gridSizeY - 0) * gridCell,
                uvX: gridSizeX / (texSizeX - 1),
                uvY: gridSizeY / (texSizeY - 1),
                unitPerPx: distanceScale,
            }
        }
    }

    render() {
        const { gl, gfx, scene } = this

        const cullAlpha = 0.01

        const time = getTime()

        this.mipCache?.resetFilePriority()
        for (const image of scene.images) {
            if (image.alpha <= cullAlpha) continue
            this.setupPageTexture(image)
        }

        gl.viewport(0, 0, this.renderWidth, this.renderHeight)

        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT)

        gl.useProgram(this.mainShader)

        for (const image of scene.images) {
            if (image.alpha <= cullAlpha) continue

            const texture = this.textureCache.get(image.pageIndex)
            if (!texture) continue

            const scale = image.scale
            const width = image.imageWidth / this.canvasWidth * scale
            const height = image.imageHeight / this.canvasHeight * scale

            gfx.applyBinds(this.mainBinds, {
                basePosition: {
                    x: image.x / this.canvasWidth,
                    y: image.y / this.canvasHeight
                },
                quadScale: { x: width, y: height },
                uvScale: texture.uvScale,
                mainTexture: texture.texture,
                fadeAmount: image.alpha,
            })
            gl.drawArrays(gl.TRIANGLES, 0, 6)
        }

        if (this.highlightQuad !== null) {
            const quad = this.highlightQuad!
            const viewport = scene.higlightViewport

            const sharpness = 160.0 * (viewport.scale / quad.unitPerPx / (this.canvasWidth / this.renderWidth))

            const fade = Math.max(0.0, 1.0 - (time - this.highlightTime) * 5.0)
            const alpha = 0.4
            const color = {
                x: alpha * 0.95 + fade * 0.1,
                y: alpha * 0.86 + fade * 0.1,
                z: alpha * 0.2,
                w: alpha - fade * 0.05,
            }

            if (fade > 0.0) {
                this.requestRender()
            }

            gl.useProgram(this.highlightShader)
            gfx.applyBinds(this.highlightBinds, {
                basePosition: {
                    x: (viewport.x + viewport.scale * quad.x) / this.canvasWidth,
                    y: (viewport.y + viewport.scale * quad.y) / this.canvasHeight
                },
                quadScale: {
                    x: (viewport.scale * quad.w) / this.canvasWidth,
                    y: (viewport.scale * quad.h) / this.canvasHeight
                },
                sharpness: sharpness,
                uvScale: {
                    x: quad.uvX,
                    y: quad.uvY,
                },
                gridTexture: this.highlightTexture,
                color,
            })

            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
            gl.drawArrays(gl.TRIANGLES, 0, 6)
            gl.disable(gl.BLEND)
        }
    }
}
