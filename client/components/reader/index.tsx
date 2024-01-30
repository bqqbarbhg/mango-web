import { immutable, useState, unwrap, useEffect } from "kaiku";
import { MangoContent, MangoInfo, RouteRead, Source, globalState, navigateTo, pushError } from "../../state";
import ImageView from "../../reader/image-view-webgl";
import { apiCall } from "../../utils/api";
import { fetchSources, refreshFlashcards, refreshVolumes } from "../../utils/fetching";
import { Reader } from "./reader";
import { sourceFetchJson } from "../../utils/source";
import { validate } from "../../utils/validation";

function Loader() {
    return <div className="reader-loader" />
}

export function Index({ route }: { route: RouteRead }) {
    const state = useState({
        startedLoad: false,
        pending: true,
        closed: false,
    })

    const path = route.id

    async function load() {
        const user = globalState.user
        if (!user) return

        let sourceUuid = route.source
        let source: Source | null = null

        let page = 1
        let readPages: number[] = []

        refreshFlashcards()

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
                    source = state.source
                }
            }

            if (source === null) {
                let volume = user.volumes.find(v => v.volume.path === path) ?? null
                if (!volume) {
                    await refreshVolumes()
                    volume = user.volumes.find(v => v.volume.path === path) ?? null
                }

                if (volume) {
                    source = volume.source
                }
            }
        } catch (err) {
            navigateTo("/")
            pushError(`Failed to load ${path}`, err, { deduplicate: true })
            return
        }

        if (source === null) {
            navigateTo("/")
            pushError(`Failed to load ${path}`, "Could not find source")
            return
        }

        try {
            await apiCall("POST /read/:*path", { page, sourceUuid, path })
        } catch (err) {
            pushError("Failed to update status", err, { deduplicate: true })
        }

        try {
            const pMangoContent = sourceFetchJson(source, `${path}/mango-content.json`)
            const pMangoInfo = sourceFetchJson(source, `${path}/mango-info.json`)
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
        if (!state.startedLoad) {
            state.startedLoad = true
            load()
        }
    })

    useEffect(() => {
        if (globalState.transitionRoute?.path === "/" && globalState.transition?.started) {
            state.closed = true
        }
    })

    return <>
        {(state.pending || state.closed) ? 
            (!globalState.transitionRoute ? <Loader /> : null)
            : <Reader />}
    </>
}
