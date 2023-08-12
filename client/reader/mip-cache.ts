import { MangoContent, SourceInfo, pushError } from "../state"
import { sourceGetBuffer, sourceGetJson } from "../utils/source"

type MipData = {
    data: DataView
    width: number
    height: number
    format: number
}

type MipPage = {
    width: number
    height: number
    mipFiles: number[]
    mipData: (MipData | null)[]
}

type MipFileState = "unloaded" | "loading" | "loaded" | "error"

type MipFile = {
    name: string
    mipLevel: number
    pageStart: number
    pageCount: number
    state: MipFileState
    lruSerial: number
    priority: number
}

function parseMipFile(data: DataView): MipData[] {
    if (data.byteLength < 4) {
        throw new Error("mip file too short")
    }
    const magic = data.getUint32(0, true)!
    if (magic === 0x30766d6d) { // 'mmv0'
        if (data.byteLength < 20) {
            throw new Error("single mip file truncated")
        }
        const width = data.getUint32(4, true)
        const height = data.getUint32(8, true)
        const size = data.getUint32(12, true)
        const format = data.getUint32(16, true)
        const mipData = new DataView(data.buffer, data.byteOffset + 20, size)
        return [{ width, height, format, data: mipData }]
    } else if (magic === 0x3076736d) { // 'msv0'
        const fileCount = data.getUint32(4, true)!
        if (data.byteLength < 8 + fileCount * 8) {
            throw new Error("multi mip file truncated")
        }

        let mips: MipData[] = []
        for (let i = 0; i < fileCount; i++) {
            const base = 8 + i * 8
            const offset = data.getUint32(base + 0, true)!
            const size = data.getUint32(base + 4, true)!
            const slice = new DataView(data.buffer, data.byteOffset + offset, size)
            const inner = parseMipFile(slice)
            mips.push(...inner)
        }
        return mips
    } else {
        throw new Error("mip file too short")
    }
}

export class MipCache {
    source: SourceInfo
    path: string
    files: MipFile[] = []
    pages: MipPage[] = []
    loadedFiles: MipFile[] = []
    priorityFiles: MipFile[] = []
    lruSerial: number = 0
    isLoading: boolean = false
    preloadPage: number = 0
    preloadInterval: number[] = [0, 1, 2, 8]
    preloadPriority: number[] = [10, 20, 40, 300]
    priorityQueueLength: number
    filePriorityDirty: boolean
    hasUnloadedFiles: boolean

    loadCallback: () => void = () => {}

    constructor(source: SourceInfo, path: string, content: MangoContent, format: string) {
        this.source = source
        this.path = path

        for (const page of content.pages) {
            this.pages.push({
                width: page.width,
                height: page.height,
                mipFiles: [],
                mipData: [],
            })
        }

        for (const files of content.files) {
            if (files.format !== format) continue

            if (files.batch) {
                for (const page of files.pages) {
                    const fileIndex = this.files.length
                    this.files.push({
                        name: page.name,
                        pageStart: page.base,
                        pageCount: page.count,
                        mipLevel: files.mipLevel,
                        state: "unloaded",
                        lruSerial: 0,
                        priority: 0,
                    })
                    for (let i = 0; i < page.count; i++) {
                        const mipPage = this.pages[page.base + i]!
                        mipPage.mipFiles[files.mipLevel] = fileIndex
                        mipPage.mipData[files.mipLevel] = null
                    }
                }
            } else {
                let index = 0
                for (const page of files.pages) {
                    const mipPage = this.pages[index]!
                    mipPage.mipFiles[files.mipLevel] = this.files.length
                    mipPage.mipData[files.mipLevel] = null
                    this.files.push({
                        name: page,
                        pageStart: index,
                        pageCount: 1,
                        mipLevel: files.mipLevel,
                        state: "unloaded",
                        lruSerial: 0,
                        priority: 0,
                    })
                    index++
                }
            }
        }
    }

    unloadFiles() {
        const maxFiles = 32
        if (this.loadedFiles.length > maxFiles) {
            this.loadedFiles.sort((a, b) => {
                if (a.priority !== b.priority) return b.priority - a.priority
                return b.lruSerial - a.lruSerial
            })
            while (this.loadedFiles.length > maxFiles) {
                const file = this.loadedFiles.pop()!
                console.log(`UNLOAD ${file.name}`)
                for (let i = 0; i < file.pageCount; i++) {
                    const page = this.pages[file.pageStart + i]!
                    page.mipData[file.mipLevel] = null
                }
                file.state = "unloaded"
            }
        }
    }

    async loadFile(file: MipFile) {
        if (file.state !== "unloaded") return

        const path = `${this.path}/${file.name}`

        this.unloadFiles()

        file.state = "loading"

        try {
            const result = await sourceGetBuffer(this.source, path)
            const mips = parseMipFile(new DataView(result))
            if (mips.length !== file.pageCount) {
                throw new Error("unexpected mip count")
            }

            for (let i = 0; i < file.pageCount; i++) {
                const page = this.pages[file.pageStart + i]!
                page.mipData[file.mipLevel] = mips[i]!
            }

            file.state = "loaded"
            this.loadedFiles.push(file)
            this.loadCallback()
        } catch (err) {
            const begin = file.pageStart + 1
            if (file.pageCount > 1) {
                const end = begin + file.pageCount - 1
                pushError(`Failed to load page images ${begin}-${end}`, err)
            } else {
                pushError(`Failed to load page image ${begin}`, err)
            }
            file.state = "error"
        }

        this.isLoading = false
        this.loadPriorityFiles()
    }

    /*
    loadPage(index: number, maxMip: number) {
        const page = this.pages[index]!
        for (let level = maxMip; level < page.mipFiles.length; level++) {
            const fileIndex = page.mipFiles[level]!
            const file = this.files[fileIndex]!
            file.lruSerial = ++this.lruSerial
            if (file.state === "unloaded") {
                this.loadFile(file)
            }
        }
    }
    */
    loadPriorityFiles() {
        if (this.isLoading) return
        if (!this.hasUnloadedFiles) return
        console.log("loading")

        this.priorityFiles.sort((a, b) => b.priority - a.priority)
        for (const file of this.priorityFiles) {
            if (file.state === "unloaded") {
                this.isLoading = true
                this.loadFile(file)
                return
            }
        }

        this.hasUnloadedFiles = false
    }

    addFilePriority(file: MipFile, priority: number) {
        if (file.priority === 0) {
            this.priorityFiles.push(file)
        }
        file.priority += priority
        if (file.state === "unloaded") {
            this.hasUnloadedFiles = true
        }
    }

    setPreloadPage(page: number) {
        if (page === this.preloadPage) return
        this.preloadPage = page
        this.filePriorityDirty = true
        this.resetFilePriority()
        this.loadPriorityFiles()
    }

    resetFilePriority() {
        if (!this.filePriorityDirty) return

        let queueLength = 0
        for (const file of this.priorityFiles) {
            if (file.state === "unloaded") {
                queueLength += 1
            }
            file.priority = 0
        }

        this.priorityQueueLength = queueLength
        this.priorityFiles.length = 0

        for (let mipLevel = 0; mipLevel < this.preloadInterval.length; mipLevel++) {
            const interval = this.preloadInterval[mipLevel]!
            const priority = this.preloadPriority[mipLevel]!
            if (interval === 0) continue

            for (let delta = -interval; delta <= interval; delta++) {
                const preloadPage = this.pages[this.preloadPage + delta]
                if (!preloadPage) continue

                const fileIndex = preloadPage.mipFiles[mipLevel]
                if (fileIndex === undefined) continue
                const file = this.files[fileIndex]!

                this.addFilePriority(file, priority - Math.abs(delta))
            }
        }

        this.filePriorityDirty = false
    }

    getMipPage(index: number, maxMip: number): MipPage {
        if (index >= this.pages.length) throw new Error("out of bounds")

        const page = this.pages[index]!
        for (let level = maxMip; level < page.mipFiles.length; level++) {
            const fileIndex = page.mipFiles[level]!
            const file = this.files[fileIndex]!
            file.lruSerial = ++this.lruSerial
            if (file.state !== "loaded") {
                this.addFilePriority(file, 100 + level)
                this.filePriorityDirty = true
            }
        }

        this.loadPriorityFiles()

        return this.pages[index]!
    }
}

/*
export class MipCache {
    mips = new Map<number, MipData[]>()

    getPageMips(pageIndex: number): MipData[] | null {
        return this.mips.get(pageIndex) ?? null
    }
}

export class MipCacheManager {
    cache: MipCache
    page: number = 0
    mipBatchSize = [1, 1, 4, 16]
    mipFiles: MipFile[][]
    source: SourceInfo
    path: string
    format: string

    constructor(cache: MipCache, pageCount: number, source: SourceInfo, path: string, format: string) {
        this.cache = cache
        this.source = source
        this.path = path
        this.format = format

        const mipAmount = this.mipBatchSize.length

        const mipFiles: MipFile[][] = []
        for (let mipI = 0; mipI < mipAmount; mipI++) {
            const batchSize = this.mipBatchSize[mipI]!
            const files: MipFile[] = []
            for (let base = 0; base < pageCount; base += batchSize) {
                const filePages = Math.min(pageCount - base, batchSize)
                files.push({
                    mips: null,
                    basePage: base,
                    mipLevel: mipI,
                    pageCount: filePages,
                    state: "unloaded"
                })
            }
            mipFiles.push(files)
        }
        this.mipFiles = mipFiles
    }

    setPage(page: number) {
        this.page = page
        for (const mips of this.mipFiles) {
            for (const mip of mips) {
                if (page < mip.basePage) continue
                if (page >= mip.basePage + mip.pageCount) continue
                console.log(mip)
                if (mip.state === "unloaded") {
                    this.loadMipFile(mip)
                }
            }
        }
    }

    async loadMipFile(mipFile: MipFile) {
        const page = (mipFile.basePage + 1).toString().padStart(3, "0")
        const batchSize = this.mipBatchSize[mipFile.mipLevel]!
        const name = batchSize > 1
            ? `pages${page}.${this.format}.${mipFile.mipLevel}.mips`
            : `page${page}.${this.format}.${mipFile.mipLevel}.mip`
        const path = `${this.path}/${name}`

        mipFile.state = "loading"

        try {
            const result = await sourceGetBuffer(this.source, path)
            const mips = parseMipFile(new DataView(result))
            if (mips.length !== mipFile.pageCount) {
                throw new Error("unexpected mip count")
            }

            for (let i = 0; i < mipFile.pageCount; i++) {
                const pageI = mipFile.basePage + i
                let mipDatas = this.cache.mips.get(pageI)
                if (!mipDatas) {
                    mipDatas = Array(this.mipBatchSize.length).fill(null)
                    this.cache.mips.set(pageI, mipDatas)
                }
                mipDatas[mipFile.mipLevel] = mips[i]!
            }

            mipFile.mips = mips
            mipFile.state = "loaded"
        } catch (err) {
            const begin = mipFile.basePage + 1
            if (mipFile.pageCount > 1) {
                const end = begin + mipFile.pageCount - 1
                pushError(`Failed to load page images ${begin}-${end}`, err)
            } else {
                pushError(`Failed to load page image ${begin}`, err)
            }
            mipFile.state = "error"
        }
    }
}
*/
