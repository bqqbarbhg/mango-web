import { MangoContent, Source, pushError } from "../state"
import { sourceFetchBuffer, sourceFetchJson } from "../utils/source"

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
    source: Source
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

    constructor(source: Source, path: string, content: MangoContent, format: string) {
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
            const result = await sourceFetchBuffer(this.source, path)
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

    loadPriorityFiles() {
        if (this.isLoading) return
        if (!this.hasUnloadedFiles) return

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
