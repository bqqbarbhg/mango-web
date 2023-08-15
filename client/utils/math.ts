
export function lerp(a: number, b: number, t: number) {
    return a * (1.0 - t) + b * t
}

export function clamp(x: number, minX: number, maxX: number) {
    return Math.min(Math.max(x, minX), maxX)
}

export function smoothStep(t: number) {
    if (t <= 0.0) return 0.0
    if (t >= 1.0) return 1.0
    return t * t * (3.0 - 2.0 * t)
}
