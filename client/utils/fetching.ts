import { Source, SourceIndex, Volume, globalState, pushError } from "../state"
import { apiCall } from "./api"
import { sourceGetJson } from "./source"
import { validate } from "./validation"

export async function fetchSources(): Promise<boolean> {
    if (globalState.user) {
        try {
            const sources = await apiCall("GET /sources", {})
            globalState.user.sources = sources.sources
            return true
        } catch (err) {
            pushError("Failed to fetch sources", err, { deduplicate: true })
            return false
        }
    } else {
        return false
    }
}

async function refreshSource(source: Source) {
    try {
        const json = await sourceGetJson(source, "index.json")
        const sourceIndex = validate(SourceIndex, json)

        return sourceIndex.volumes
    } catch (err) {
        pushError(`Failed to update ${source.url}`, err, {
            deduplicate: true,
        })
        throw err
    }
}

export async function refreshFlashcards(): Promise<boolean> {
    const user = globalState.user
    if (!user) return false
    try {
        const result = await apiCall("GET /flashcards", {})
        console.log(result)
        user.flashcards = result.results
        user.flashcardLevel = new Map(result.results.map(f => [f.word, 1]))
        return true
    } catch (err) {
        pushError("Failed to update flashcards", err, {
            deduplicate: true,
        })
        throw err
    }
}

export async function refreshVolumes(): Promise<boolean> {
    const user = globalState.user
    if (!user) return false

    try {
        const pUserVolumes = apiCall("GET /volumes", {})

        try {
            const sources = await apiCall("GET /sources", {})
            user.sources = sources.sources
        } catch (err) {
            pushError("Failed to update sources", err)
        }

        const sources = user.sources
        const promises = sources.map(source => refreshSource(source))
        const sourceVolumes = await Promise.allSettled(promises)

        const volumes: Volume[] = sourceVolumes.flatMap((p, index) => {
            if (p.status === "rejected") return []
            const source = sources[index]!
            return p.value.map(volume => ({
                volume, source,
                latestPage: null,
            }))
        }).filter(v => v.volume.path.includes("Yotsuba"))

        const userVolumes = await pUserVolumes
        const sourceLatestPage = new Map<string, number>()
        for (const volume of userVolumes.sources) {
            if (volume.latestPage) {
                sourceLatestPage.set(volume.path, volume.latestPage)
            }
        }

        for (const volume of volumes) {
            volume.latestPage = sourceLatestPage.get(volume.volume.path) ?? null
        }

        user.volumes = volumes
        return true
    } catch (err) {
        pushError("Failed to update volumes", err)
        return false
    }
}

