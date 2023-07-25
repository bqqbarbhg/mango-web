import { Source, SourceIndex, globalState, pushError } from "../state"
import { apiCall } from "./api"
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
        const url = `${source.url}/index.json`
        const response = await fetch(url)
        const json = await response.json()

        const sourceIndex = validate(SourceIndex, json)

        return sourceIndex.volumes
    } catch (err) {
        pushError(`Failed to update ${source.url}`, err, {
            deduplicate: true,
        })
        throw err
    }
}

export async function refreshVolumes(): Promise<boolean> {
    const user = globalState.user
    if (!user) return false

    try {
        try {
            const sources = await apiCall("GET /sources", {})
            user.sources = sources.sources
        } catch (err) {
            pushError("Failed to update sources", err)
        }

        const sources = user.sources
        const promises = sources.map(source => refreshSource(source))
        const sourceVolumes = await Promise.allSettled(promises)

        const volumes = sourceVolumes.flatMap((p, index) => {
            if (p.status === "rejected") return []
            const source = sources[index]!
            return p.value.map(volume => ({
                volume,
                sourceUrl: source.url,
                sourceUuid: source.uuid,
            }))
        })

        user.volumes = volumes
        return true
    } catch (err) {
        pushError("Failed to update volumes", err)
        return false
    }
}

