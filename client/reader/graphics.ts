
export type UniformBindContext = {
    textureIndex: number
}

export type UniformBindFunction = (gl: WebGL2RenderingContext, ctx: UniformBindContext, bind: UniformBind, value: any) => void

export type UniformBind = {
    location: WebGLUniformLocation | null
    name: string
    bindFunc: UniformBindFunction
}

export type UniformBinds = UniformBind[]

export const UniformBind = {
    float: (gl: WebGL2RenderingContext, ctx: UniformBindContext, bind: UniformBind, value: any) => {
        gl.uniform1f(bind.location, value)
    },
    vec2: (gl: WebGL2RenderingContext, ctx: UniformBindContext, bind: UniformBind, value: any) => {
        gl.uniform2f(bind.location, value.x, value.y)
    },
    texture2d: (gl: WebGL2RenderingContext, ctx: UniformBindContext, bind: UniformBind, value: any) => {
        const index = ctx.textureIndex++
        gl.activeTexture(gl.TEXTURE0 + index)
        gl.bindTexture(gl.TEXTURE_2D, value)
        gl.uniform1i(bind.location, index)
    },
    ignore: (_gl: WebGL2RenderingContext, _ctx: UniformBindContext, _bind: UniformBind, _value: any) => {
    },
}

export class GraphicsContext {
    gl: WebGL2RenderingContext
    #bindCtx: UniformBindContext

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl
        this.#bindCtx = { textureIndex: 0 }
    }

    check<T>(object: T, desc: string): asserts object is NonNullable<T> {
        if (!object) {
            const err = this.gl.getError()
            throw new Error(`WebGL error: ${desc}: ${err}`)
        }
    }

    compileShader(type: number, source: string): WebGLShader {
        const { gl } = this

        const shader = gl.createShader(type)
        this.check(shader, "createShader()")
        gl.shaderSource(shader, source)
        gl.compileShader(shader)

        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) {
            const log = gl.getShaderInfoLog(shader)
            throw new Error(`Failed to compile shader:\n${log}`)
        }

        return shader
    }

    compileProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
        const { gl } = this

        const vs = this.compileShader(gl.VERTEX_SHADER, vertexSource)
        const fs = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource)

        const program = gl.createProgram()
        this.check(program, "createProgram()")

        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)

        if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
            const log = gl.getProgramInfoLog(program)
            throw new Error(`Failed to link program:\n${log}`)
        }

        gl.detachShader(program, vs)
        gl.detachShader(program, fs)
        gl.deleteShader(vs)
        gl.deleteShader(fs)

        return program
    }

    createUniformBinds(program: WebGLProgram, spec: Record<string, UniformBindFunction>): UniformBinds {
        const { gl } = this

        return Object.keys(spec).map(name => {
            const location = gl.getUniformLocation(program, name)
            if (location === null) {
                console.warn(`Uniform '${name}' not found in program`)
                return { name, location: null, bindFunc: UniformBind.ignore }
            }
            return { name, location, bindFunc: spec[name]! }
        })
    }

    createTexture(image: HTMLImageElement) {
        const { gl } = this

        const texture = gl.createTexture()
        this.check(texture, "createTexture()")

        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
            gl.RGBA, gl.UNSIGNED_BYTE, image)
        gl.generateMipmap(gl.TEXTURE_2D)

        return texture
    }

    createBuffer(target: number, usage: number, data: BufferSource) {
        const { gl } = this

        const buffer = gl.createBuffer()
        this.check(buffer, "createBuffer()")

        gl.bindBuffer(target, buffer)
        gl.bufferData(target, data, usage)
        gl.bindBuffer(target, null)

        return buffer
    }

    applyBinds(binds: UniformBinds, values: Record<string, any>) {
        const { gl } = this
        const bindCtx = this.#bindCtx

        for (const bind of binds) {
            bind.bindFunc(gl, bindCtx, bind, values[bind.name])
        }

        if (bindCtx.textureIndex > 0) {
            gl.activeTexture(gl.TEXTURE0 + 0)
            bindCtx.textureIndex = 0
        }
    }

}
