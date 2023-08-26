
export type HighlightOptions = {
    duration: number
    color: string
    padding?: number
    radius?: number
    targetScale?: number
    opacity?: number
}

export const HighlightPulse: HighlightOptions = {
    duration: 0.3,
    color: "#fff",
    padding: 4,
    radius: 12,
    targetScale: 1.1,
    opacity: 0.15,
}

export function showHighlight(element: HTMLElement, options: HighlightOptions) {
    const div = document.createElement("div")
    const rect = element.getBoundingClientRect()

    const pad = options.padding ?? 0
    const radius = options.radius ?? pad
    div.style.position = "absolute"
    div.style.left = `${rect.x - pad}px`
    div.style.top = `${rect.y - pad}px`
    div.style.width = `${rect.width + pad*2}px`
    div.style.height = `${rect.height + pad*2}px`
    div.style.backgroundColor = options.color
    div.style.borderRadius = `${options.padding ?? 0}px`
    div.style.zIndex = "5"
    div.style.touchAction = "none"
    div.style.pointerEvents = "none"

    const targetScale = options.targetScale ?? 1
    const duration = options.duration * 1000
    const anim = div.animate([
        {
            transform: "scale(1)",
            easing: "ease-out",
        },
        {
            transform: `scale(${targetScale})`,
        },
    ], { duration })
    div.animate([
        {
            opacity: `${options.opacity ?? 1}`,
            easing: "linear",
        },
        {
            opacity: "0",
        },
    ], { duration })

    anim.addEventListener("finish", () => {
        div.remove()
    })

    document.body.appendChild(div)
}
