import { immutable, useState, unwrap, useEffect } from "kaiku";
import { MangoContent, MangoInfo, RouteRead, globalState, navigateTo, pushError } from "../../state";
import ImageView from "../../reader/image-view-webgl";
import { apiCall } from "../../utils/api";
import { fetchSources, refreshVolumes } from "../../utils/fetching";
import { Reader } from "./reader";
import { sourceGetJson } from "../../utils/source";
import { validate } from "../../utils/validation";


function Loader() {
    return <h1>...</h1>
}

export function Index() {
    const route = globalState.route as RouteRead
    const state = useState({
        pending: true,
    })

    const path = route.id

    async function load() {
        const user = globalState.user
        if (!user) return

        let sourceUuid = route.source
        let sourceUrl: string | null = null

        let page = 1
        let readPages: number[] = []

        try {
            const { result: state } = await apiCall("GET /read/:*path", { path })
            if (state && state.page) {
                page = state.page
            }
            if (state && state.readPages) {
                readPages = state.readPages
            }

            if (state && state.source) {
                if (sourceUuid === null) {
                    sourceUuid = state.source.uuid
                }
                if (state.source.uuid === sourceUuid) {
                    sourceUrl = state.source.url
                }
            }

            if (sourceUrl === null) {
                let volume = user.volumes.find(v => v.volume.path === path) ?? null
                if (!volume) {
                    await refreshVolumes()
                    volume = user.volumes.find(v => v.volume.path === path) ?? null
                }

                if (volume) {
                    sourceUuid = volume.sourceUuid
                    sourceUrl = volume.sourceUrl
                }
            }
        } catch (err) {
            navigateTo("/")
            pushError(`Failed to load ${path}`, err, { deduplicate: true })
            return
        }

        if (sourceUrl === null) {
            navigateTo("/")
            pushError(`Failed to load ${path}`, "Could not find source")
            return
        }

        try {
            await apiCall("POST /read/:*path", { page, sourceUuid, path })
        } catch (err) {
            pushError("Failed to update status", err, { deduplicate: true })
        }

        const source = { url: sourceUrl, uuid: sourceUrl }

        try {
            const pMangoContent = sourceGetJson(source, `${path}/mango-content.json`)
            const pMangoInfo = sourceGetJson(source, `${path}/mango-info.json`)
            const [mangoContent, mangoInfo] = await Promise.all([pMangoContent, pMangoInfo])

            const currentVolume = {
                path, source,
                info: immutable(validate(MangoInfo, mangoInfo)),
                content: immutable(validate(MangoContent, mangoContent)),
                currentPage: page - 1,
                readPages,
            }

            user.currentVolume = currentVolume
        } catch (err) {
            navigateTo("/")
            pushError(`Failed to load ${path}`, err)
        }

        user.overlay = {
            page: null,
            hint: null,
            hintId: -1,
            translation: null,
            rootRef: { current: null },
        }

        if (sourceUuid !== null) {
            window.history.replaceState(null, "", window.location.pathname)
        }

        state.pending = false
    }

    useEffect(() => {
        load()
    })

    // @ts-ignore
    return state.pending ? <Loader /> : <Reader />
}
