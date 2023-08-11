
export class ParseError extends Error {
    parseError: string
    constructor(message: string) {
        super(`Failed to parse KTX: ${message}`)
        this.parseError = message
    }
}

const magicRef = new Uint8Array([
    0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A,
])

function arrayEquals(a: Uint8Array, b: Uint8Array): boolean {
    const length = a.length
    if (length !== b.length) return false
    for (let i = 0; i < length; i++) {
        if (a[i] !== b[i]) return false
    }
    return true
}

function check(cond: boolean, msg: string): asserts cond {
    if (!cond) {
        throw new ParseError(msg)
    }
}

export type KtxHeader = {
    glType: number
    glTypeSize: number
    glFormat: number
    glInternalFormat: number
    glBaseInternalFormat: number
    pixelWidth: number
    pixelHeight: number
    pixelDepth: number
    numberOfArrayElements: number
    numberOfFaces: number
    numberOfMipmapLevels: number
}

export type KtxKeyValuePair = {
    key: string
    value: ArrayBuffer | any
}

export type KtxFile = {
    header: KtxHeader
    keyValuePairs: KtxKeyValuePair[]
    mips: ArrayBuffer[][]
}

export function ktxString(buf: ArrayBuffer): string {
    if (buf.byteLength === 0) return ""
    const nullTerminator = new Uint8Array(buf, buf.byteLength - 1, 1)
    if (nullTerminator[0] === 0) {
        buf = buf.slice(0, buf.byteLength - 1)
    }

    const keyDecoder = new TextDecoder("utf-8", { fatal: true })
    return keyDecoder.decode(buf)
}

export function ktxJson(buf: ArrayBuffer): any {
    return JSON.parse(ktxString(buf))
}

type KtxOptions = {
    keyValueTypes?: Record<string, (buf: ArrayBuffer) => any>
}

export function parseKtx(data: ArrayBuffer, opts?: KtxOptions): KtxFile {
    opts = opts ?? { }

    const u8 = new Uint8Array(data)
    const u32 = new Uint32Array(data)

    check(data.byteLength >= 60, "file too short")

    const magic = u8.slice(0, 12)
    check(arrayEquals(magic, magicRef), "invalid KTX magic")

    const endianness = u32[3]
    let readU32
    if (endianness === 0x04030201) {
        readU32 = (ix: number) => u32[ix]!
    } else if (endianness === 0x01020304) {
        readU32 = (ix: number) => {
            const v = u32[ix]!
            return (v >> 24)
                | ((v >> 8) & 0x0000ff00)
                | ((v << 8) & 0x00ff0000)
                | (v << 24)
        }
    } else {
        throw new ParseError("bad endianness value")
    }

    const header = {
        glType: readU32(4),
        glTypeSize: readU32(5),
        glFormat: readU32(6),
        glInternalFormat: readU32(7),
        glBaseInternalFormat: readU32(8),
        pixelWidth: readU32(9),
        pixelHeight: readU32(10),
        pixelDepth: readU32(11),
        numberOfArrayElements: readU32(12),
        numberOfFaces: readU32(13),
        numberOfMipmapLevels: readU32(14),
    }
    const bytesOfKeyValueData = readU32(15)
    check(data.byteLength >= 60 + bytesOfKeyValueData, "key/value data truncated")

    const keyValuePairs: KtxKeyValuePair[] = []
    let fileOffset = 64
    const keyValueEnd = 64 + bytesOfKeyValueData
    while (fileOffset < keyValueEnd) {
        const keyAndValueByteSize = readU32(fileOffset / 4)
        check(data.byteLength >= fileOffset + keyAndValueByteSize, `key/value ${keyValuePairs.length} truncated`)
        fileOffset += 4

        let keyLength = 0
        while (u8[fileOffset + keyLength] !== 0) {
            check(keyLength < keyAndValueByteSize, `key/value ${keyValuePairs.length} truncated`)
            keyLength += 1
        }

        const keyBytes = data.slice(fileOffset, fileOffset + keyLength)
        const key = ktxString(keyBytes)

        const valueOffset = fileOffset + keyLength + 1
        let value = data.slice(valueOffset, valueOffset + keyAndValueByteSize - keyLength - 1)

        if (opts.keyValueTypes?.hasOwnProperty(key)) {
            value = opts.keyValueTypes[key]!(value)
        }

        keyValuePairs.push({ key, value })

        fileOffset += (keyAndValueByteSize + 3) & ~3
    }
    check(fileOffset === keyValueEnd, "key/value data size mismatch")

    const sliceCount = Math.max(header.numberOfArrayElements, 1)
        * Math.max(header.numberOfFaces, 1)
    
    const mips: ArrayBuffer[][] = []
    for (let mipI = 0; mipI < header.numberOfMipmapLevels; mipI++) {
        const mipSize = readU32(fileOffset / 4)
        const mipSizeRound = (mipSize + 3) & ~3

        check(fileOffset + 4 + mipSizeRound * sliceCount <= data.byteLength, `mip ${mipI} truncated`)
        fileOffset += 4

        let slices: ArrayBuffer[] = []
        for (let sliceI = 0; sliceI < sliceCount; sliceI++) {
            const sliceOffset = fileOffset + sliceI * mipSizeRound
            slices.push(data.slice(sliceOffset, sliceOffset + mipSize))
        }

        mips.push(slices)

        fileOffset += sliceCount * mipSizeRound
    }

    return { header, keyValuePairs, mips }
}
