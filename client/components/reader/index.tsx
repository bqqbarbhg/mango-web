import { immutable, useState, unwrap, useEffect } from "kaiku";
import { RouteRead, globalState, navigateTo, pushError } from "../../state";
import ImageView from "../../reader/image-view";
import { apiCall } from "../../utils/api";
import { fetchSources, refreshVolumes } from "../../utils/fetching";

function Viewer() {
    type State = {
        parentRef: { current?: HTMLElement }
        canvasRef: { current?: HTMLCanvasElement }
        imageView: ImageView | null
    }

    const state = useState<State>({
        parentRef: { },
        canvasRef: { },
        imageView: null,
    })

    if (state.canvasRef.current && state.parentRef.current && !state.imageView) {
        const imageView = new ImageView(
            unwrap(state.parentRef.current as any),
            unwrap(state.canvasRef.current as any))
        state.imageView = immutable(imageView)

        const image = new Image()
        image.src = "/test-image.png"
        image.addEventListener("load", () => {
            console.log("LOAD")
            imageView.setImage(image)
        })

        function render() {
            imageView.render()
            window.requestAnimationFrame(render)
        }
        render()
    }

    console.log("RENDER")

    const imageView = state.imageView ? unwrap(state.imageView as any) : null

    if (imageView) {
    }

    return <div>
        <div ref={state.parentRef} className="viewer-parent">
            <canvas ref={state.canvasRef} />
        </div>
    </div>
}

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

        try {
            const { result: state } = await apiCall("GET /read/:*path", { path })
            if (state && state.page) {
                page = state.page
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
    }

    useEffect(() => {
        load()
        state.pending = false
    })

    /*

    async function update() {
        const user = globalState.user
        if (!user) return

        try {
            let sourceUuid = route.source

            let volume = user.volumes.find(v => v.volume.path === path) ?? null
            if (!volume && sourceUuid) {
                let source = user.sources.find(s => s.uuid === sourceUuid)
                if (!source) {
                }
            }

            const result = await apiCall("POST /read", {
                sourceUuid: route.source,
                path,
            })

        } catch (err) {
            pushError("Failed to update", err, { deduplicate: true })
        }
        state.pending = false
    }

    useEffect(() => {
        update()
    })

    */

    return state.pending ? <Loader /> : <Viewer />
}
