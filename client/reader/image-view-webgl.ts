import { GraphicsContext, UniformBind } from "./graphics"
import type { UniformBinds } from "./graphics"

import vertexShader from "./shader/vertex.glsl"
import fragmentShader from "./shader/fragment.glsl"
import ImageView, { ImageViewImage, ImageViewScene } from "./image-view"
import { KtxFile } from "../utils/ktx"
import { MipCache } from "./mip-cache"

type PageTexture = {
    mipMin: number
    mipMax: number
    uvScale: { x: number, y: number }
    texture: WebGLTexture
    lruSerial: number
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

        this.mainShader = gfx.compileProgram(vertexShader, fragmentShader)
        this.mainBinds = gfx.createUniformBinds(this.mainShader, {
            basePosition: UniformBind.vec2,
            quadScale: UniformBind.vec2,
            uvScale: UniformBind.vec2,
            mainTexture: UniformBind.texture2d,
            fadeAmount: UniformBind.float,
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

    /*
    setImage(format: string, image: any) {
        const { gl, gfx } = this

        if (this.texture !== null) {
            gl.deleteTexture(this.texture)
        }

        if (format === "ktx") {
            const ktx = image as KtxFile
            const textureWidth = ktx.header.pixelWidth
            const textureHeight = ktx.header.pixelHeight

            const mangoJson = ktx.keyValuePairs.find(kv => kv.key === "mango:json")
            const originalSize = mangoJson?.value?.originalSize
            this.imageWidth = originalSize.x ?? textureWidth
            this.imageHeight = originalSize.y ?? textureHeight

            const texture = gl.createTexture()
            gl.bindTexture(gl.TEXTURE_2D, texture)
            // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, canvas)

            const internalFormat = ktx.header.glInternalFormat

            let extent = 1
            let actualMipAmount = 1
            while (extent < Math.max(textureWidth, textureHeight)) {
                extent *= 2
                actualMipAmount += 1
            }


            const mipAmount = ktx.mips.length
            gl.texStorage2D(
                gl.TEXTURE_2D, actualMipAmount,
                internalFormat, extent, extent)

            let mipWidth = textureWidth
            let mipHeight = textureHeight
            for (let mipI = 0; mipI < mipAmount; mipI++) {
                const mip = ktx.mips[mipI]![0]!
                gl.compressedTexSubImage2D(
                    gl.TEXTURE_2D,
                    mipI,
                    0, 0,
                    mipWidth, mipHeight,
                    internalFormat,
                    new DataView(mip))
                mipWidth >>= 1
                mipHeight >>= 1
            }

            this.textureWidth = extent
            this.textureHeight = extent

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAX_LOD, mipAmount - 1)

            this.texture = texture
        }

        /*
        this.imageWidth = image.width
        this.imageHeight = image.height

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

        this.textureWidth = extent
        this.textureHeight = extent

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
        */

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
                console.log(`DEL ${entry.texture}`)
                this.textureCache.delete(minKey)
            }
        }
    }

    render() {
        const { gl, gfx, scene } = this

        const cullAlpha = 0.01

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
    }
}
