import { immutable, useState, unwrap } from "kaiku";
import { RouteRead, globalState } from "../../state";
import ImageView from "../../reader/image-view";

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
export function Index() {

    const route = globalState.route as RouteRead
    return <Viewer />
}
