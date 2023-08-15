import { globalState } from "../../state";
import * as css from "./transition.module.css"
import { lerp, smoothStep } from "../../utils/math"

let transitionFrameToken: number | null = null
function updateTransition() {
    transitionFrameToken = null

    const transition = globalState.transition
    const bgElement = document.getElementById("transition-bg")
    const srcElement = document.getElementById("transition-src")
    const dstElement = document.getElementById("transition-dst")
    if (!bgElement || !srcElement || !dstElement || !transition) return

    const time = performance.now() * 1e-3
    const t = Math.min((time - transition.startTime) / transition.duration, 1.0)
    const { src, dst } = transition
    const alpha = smoothStep(t)

    const x = lerp(src.rect.x, dst.rect.x, alpha)
    const y = lerp(src.rect.y, dst.rect.y, alpha)
    const w = lerp(src.rect.width, dst.rect.width, alpha) / src.rect.width
    const h = lerp(src.rect.height, dst.rect.height, alpha) / src.rect.height
    const opacity = lerp(src.opacity, dst.opacity, alpha)

    const transform = `translate(${x}px, ${y}px) scale(${w}, ${h})`

    if (!transition.started) {
        transition.started = true
        transition.onStart?.()
    }

    bgElement.style.opacity = `${opacity}`
    bgElement.style.visibility = "visible"

    srcElement.style.zIndex = "10"
    srcElement.style.visibility = "visible"
    srcElement.style.transform = transform

    dstElement.style.zIndex = "11"
    dstElement.style.visibility = "visible"
    dstElement.style.transform = transform
    dstElement.style.opacity = `${smoothStep(alpha)}`

    if (alpha < 1.0) {
        requestTransition()
    } else {
        transition.onEnd?.()
        transition.done = true
    }
}

function requestTransition() {
    if (transitionFrameToken === null) {
        transitionFrameToken = window.requestAnimationFrame(updateTransition)
    }
}

let loadCount = 0

const bumpLoad = () => {
    loadCount++
    console.error(loadCount)
    if (loadCount === 3) {
        doLoad()
    }
}

const doLoad = () => {
    const transition = globalState.transition!
    transition.startTime = performance.now() * 1e-3
    requestTransition()
}

export function Transition() {
    const transition = globalState.transition
    if (!transition) return null

    if (!transition.initialized) {
        transition.initialized = true
        loadCount = 0
        window.setTimeout(bumpLoad, 100)
        window.setTimeout(() => {
            bumpLoad()
            bumpLoad()
        }, 500)
    }

    return <div className={css.parent}>
        <div
            id="transition-bg"
            className={css.bg}
        />
        <img
            id="transition-src"
            src={transition.src.image}
            className={css.image}
            onLoad={bumpLoad}
            style={{
                width: transition.src.rect.width,
                height: transition.src.rect.height,
            }}
        />
        <img
            id="transition-dst"
            src={transition.dst.image}
            className={css.image}
            onLoad={bumpLoad}
            style={{
                width: transition.src.rect.width,
                height: transition.src.rect.height,
            }}
        />
    </div>
}
