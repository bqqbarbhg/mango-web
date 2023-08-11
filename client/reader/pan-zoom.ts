import { Viewport, clickTime, doubleTapDistance, doubleTapThreshold } from "./common"

type TouchId = number | string
type Touch = {
    id: TouchId
    startX: number
    startY: number
    positionX: number
    positionY: number
    prevVelocityX: number
    prevVelocityY: number
    velocityX: number
    velocityY: number
    eventPositionX: number
    eventPositionY: number
    startTime: number
    eventTime: number
    sampleTime: number
    samplePositionX: number
    samplePositionY: number
    prevPositionX: number
    prevPositionY: number
    prevTime: number
    velDelta: number
    prevVelDelta: number
    vel: number
    doubleTap: boolean
}

type TouchRelease = {
    id: TouchId
    nextX: number
    nextY: number
    prevX: number
    prevY: number
    positionX: number
    positionY: number
    velocityX: number
    velocityY: number
    velDelta: number
    time: number
    updateTime: number
}

function getTime(): number {
    return performance.now() * 1e-3
}

interface IPanZoomDebug {
    render(panZoom: PanZoom): void
}

function lerp(a: number, b: number, t: number) {
    return a * (1.0 - t) + b * t
}

function absLerp(a: number, b: number, t: number, absT: number) {
    const v = a * (1.0 - t) + b * t
    const d = b - v
    return v + clamp(d, -absT, absT)
}

function eerp(a: number, b: number, t: number) {
    return Math.pow(a, 1.0 - t) * Math.pow(b, t)
}

function clamp(x: number, minX: number, maxX: number) {
    return Math.min(Math.max(x, minX), maxX)
}

function smoothStep(t: number) {
    if (t <= 0.0) return 0.0
    if (t >= 1.0) return 1.0
    return t * t * (3.0 - 2.0 * t)
}

type ActionHold = {
    action: "hold"
    noClampDirection: number
}

type ActionPan = {
    action: "pan"
    localX: number
    localY: number
    scale: number
    noClampDirection: number
    fromZoom: boolean
}

type ActionZoom = {
    action: "zoom"
    localX: number
    localY: number
    scale: number
    distance: number
}

type ActionSingleZoom = {
    action: "single-zoom"
    pageX: number
    pageY: number
    localX: number
    localY: number
    scale: number
}

type ActionInterpolate = {
    action: "interpolate"
    src: Viewport
    dst: Viewport
    startTime: number
    duration: number
}

type ActionFade = {
    action: "fade"
    direction: "in" | "out"
    src: Viewport
    dst: Viewport
    startTime: number
    duration: number
    horizontalDirection: number
    srcAlpha: number
}

type ViewBounds = {
    minX: number
    minY: number
    maxX: number
    maxY: number
}

export type ClickInfo = {
    x: number
    y: number
    doubleClick: boolean
}

export type ReleaseInfo = {
    fromZoom: boolean
}

type Action =
    | ActionHold
    | ActionPan
    | ActionZoom
    | ActionSingleZoom
    | ActionInterpolate
    | ActionFade

const sampleTargetDt = 1.0 / 45.0
const releaseFixedDt = 1.0 / 30.0

export class PanZoom {
    touches: Touch[] = []
    debug: IPanZoomDebug | null
    release: TouchRelease | null = null
    lastReleaseTime: number = -1.0
    lastClickTime: number = -1.0
    lastClickX: number = -1.0
    lastClickY: number = -1.0
    action: Action | null = null
    viewport: Viewport = { x: 0, y: 0, scale: 1 }
    clampedViewport: Viewport = { x: 0, y: 0, scale: 1 }
    viewBounds: ViewBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    animationFrameToken: number | null = null
    parentWidth: number = 1
    parentHeight: number = 1
    contentWidth: number = 1
    contentHeight: number = 1
    minScale: number = 1
    maxScale: number = 1
    clickTimeout: number | null = null
    fadeEndCallbacks: (() => void)[] = []
    fadeAlpha: number = 0
    pageChangeForce: number = 0
    pageChangeVisualForce: number = 0
    pageChangeReleaseForce: number = 0
    pageChangeHideVisual: boolean = false

    // Callbacks
    viewportCallback: (viewport: Viewport, fade: number) => void = () => {}
    clickCallback: (click: ClickInfo) => boolean = () => false
    releaseCallback: (release: ReleaseInfo) => boolean = () => false
    clickTimeoutCallback: () => boolean = () => false

    constructor(element: HTMLElement, debug?: IPanZoomDebug) {

        element.addEventListener("mousedown", this.onMouseDown)
        element.addEventListener("mousemove", this.onMouseMove)
        element.addEventListener("mouseup", this.onMouseUp)
        element.addEventListener("mouseleave", this.onMouseLeave)

        element.addEventListener("touchstart", this.onTouchStart, { passive : false })
        element.addEventListener("touchmove", this.onTouchMove, { passive : false })
        element.addEventListener("touchend", this.onTouchEnd, { passive : false })
        element.addEventListener("touchcancel", this.onTouchCancel, { passive : false })

        this.debug = debug ?? null
    }

    addTouch(id: TouchId, x: number, y: number) {
        this.removeTouch(id, false, -1, -1)

        if (this.touches.length >= 2) return

        const time = getTime()

        this.touches.push({
            id,
            startX: x,
            startY: y,
            positionX: x,
            positionY: y,
            prevVelocityX: 0.0,
            prevVelocityY: 0.0,
            velocityX: 0.0,
            velocityY: 0.0,
            eventPositionX: x,
            eventPositionY: y,
            samplePositionX: x,
            samplePositionY: y,
            prevPositionX: x,
            prevPositionY: y,
            startTime: time,
            eventTime: time,
            sampleTime: time,
            prevTime: time,
            velDelta: 0.0,
            prevVelDelta: 0.0,
            vel: 0.0,
            doubleTap: false,
        })

        if (this.touches.length === 1 && time - this.lastClickTime <= doubleTapThreshold) {
            const dx = x - this.lastClickX
            const dy = y - this.lastClickY
            const dist = Math.sqrt(dx*dx + dy*dy)

            if (dist < doubleTapDistance) {
                const a = this.touches[0]!
                a.doubleTap = true
            }
        }

        if (this.touches.length === 1 && !this.touches[0]!.doubleTap) {
            this.lastClickTime = time
        } else {
            this.lastClickTime = -1
        }
        this.lastClickX = x
        this.lastClickY = y

        this.lastReleaseTime = -1

        this.cancelClickTimeout()
        this.updateAction()
        this.requestAnimationFrame()
    }

    findTouch(id: TouchId): Touch | null {
        for (const touch of this.touches) {
            if (touch.id === id) return touch
        }
        return null
    }

    updateTouch(id: TouchId, x: number, y: number) {
        const touch = this.findTouch(id)
        if (!touch) return
        this.pageChangeHideVisual = false

        const time = getTime()
        this.updateTouchPosition(touch, time)
        touch.prevPositionX = touch.positionX
        touch.prevPositionY = touch.positionY
        touch.prevTime = time

        touch.eventPositionX = x
        touch.eventPositionY = y
        touch.eventTime = time

        this.updateAction()
        this.requestAnimationFrame()
    }

    removeTouch(id: TouchId, up: boolean, x: number, y: number) {
        let index = 0
        const time = getTime()
        for (const touch of this.touches) {
            if (touch.id === id) {
                let sampleDt = time - touch.sampleTime
                const sampleAlpha = clamp(sampleDt / sampleTargetDt, 0.0, 1.0)
                this.updateTouchPosition(touch, time)

                const releaseDebounce = 0.15
                const hasRelease = this.touches.length == 1
                    && time - this.lastReleaseTime >= releaseDebounce
                    && this.action?.action !== "single-zoom"

                const deltaX = x - touch.startX
                const deltaY = y - touch.startY
                const deltaTime = Math.max(time - touch.startTime, 0.01)
                const velX = deltaX / deltaTime
                const velY = deltaY / deltaTime

                const avgVelLerp = clamp(1.5 - deltaTime / 0.2, 0, 1)

                const velocityX = lerp(lerp(touch.prevVelocityX, touch.velocityX, sampleAlpha), velX, avgVelLerp)
                const velocityY = lerp(lerp(touch.prevVelocityY, touch.velocityY, sampleAlpha), velY, avgVelLerp)

                this.release = {
                    id: touch.id,
                    prevX: this.viewport.x,
                    prevY: this.viewport.y,
                    nextX: this.viewport.x,
                    nextY: this.viewport.y,
                    positionX: touch.positionX,
                    positionY: touch.positionY,
                    velocityX: hasRelease ? velocityX : 0.0,
                    velocityY: hasRelease ? velocityY : 0.0,
                    velDelta: hasRelease ? lerp(touch.prevVelDelta, touch.velDelta, sampleAlpha) : 0.0,
                    updateTime: time,
                    time,
                }

                const releaseVelocity = Math.sqrt(velocityX*velocityX + velocityY*velocityY)

                this.touches.splice(index, 1)

                const isClick = up && time - touch.startTime <= clickTime && releaseVelocity <= 750
                if (isClick && this.touches.length === 0 && this.action?.action === "hold") {
                    const doubleClick = touch.doubleTap
                    const consumed = this.clickCallback({
                        x: (touch.eventPositionX - this.clampedViewport.x) / this.clampedViewport.scale,
                        y: (touch.eventPositionY - this.clampedViewport.y) / this.clampedViewport.scale,
                        doubleClick,
                    })

                    this.cancelClickTimeout()

                    if (!consumed) {
                        if (touch.doubleTap) {
                            this.doubleTapView(touch.eventPositionX, touch.eventPositionY)
                        } else {
                            this.clickTimeout = window.setTimeout(this.onClickTimeout, doubleTapThreshold * 1000)
                        }
                    }
                } else {
                    this.pageChangeReleaseForce = velocityX
                    const releaseInfo = {
                        fromZoom: this.action?.action === "zoom"
                            || this.action?.action === "single-zoom"
                            || (this.action?.action === "pan" && this.action.fromZoom),
                    }
                    if (releaseInfo.fromZoom) {
                        this.pageChangeHideVisual = true
                    }
                    if (this.releaseCallback(releaseInfo)) {
                        this.release = null
                    }
                }

                break
            }
            index++
        }

        this.lastReleaseTime = time
        this.updateAction()
        this.requestAnimationFrame()
    }

    cancelClickTimeout() {
        if (this.clickTimeout !== null) {
            window.clearTimeout(this.clickTimeout)
            this.clickTimeout = null
        }
    }

    onClickTimeout = () => {
        if (this.clickTimeout === null) return
        this.clickTimeout = null

        this.clickTimeoutCallback()
    }

    onMouseDown = (e: MouseEvent) => {
        if (e.button > 2) return
        e.preventDefault()
        if (e.button === 0 || e.button === 1) {
            this.addTouch("mouse", e.pageX, e.pageY)
        }
    }

    onMouseMove = (e: MouseEvent) => {
        e.preventDefault()
        this.updateTouch("mouse", e.pageX, e.pageY)
    }

    onMouseUp = (e: MouseEvent) => {
        if (e.button > 2) return
        e.preventDefault()
        if (e.button === 0 || e.button === 1) {
            this.removeTouch("mouse", true, e.pageX, e.pageY)
        }
    }

    onMouseLeave = (e: MouseEvent) => {
        e.preventDefault()
        this.removeTouch("mouse", false, -1, -1)
    }

    onTouchStart = (e: TouchEvent) => {
        e.preventDefault()
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i]!
            this.addTouch(touch.identifier, touch.pageX, touch.pageY)
        }
    }

    onTouchMove = (e: TouchEvent) => {
        e.preventDefault()
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i]!
            this.updateTouch(touch.identifier, touch.pageX, touch.pageY)
        }
    }

    onTouchEnd = (e: TouchEvent) => {
        e.preventDefault()
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i]!
            this.removeTouch(touch.identifier, true, touch.pageX, touch.pageY)
        }
    }

    onTouchCancel = (e: TouchEvent) => {
        e.preventDefault()
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i]!
            this.removeTouch(touch.identifier, false, -1, -1)
        }
    }

    updateTouchPosition(touch: Touch, time: number) {
        let extrapolate = true
        let slowDamp = true

        if (this.action?.action === "single-zoom") {
            extrapolate = false
            slowDamp = false
        }

        let sampleDt = time - touch.sampleTime
        if (sampleDt >= sampleTargetDt) {
            touch.prevVelocityX = touch.velocityX
            touch.prevVelocityY = touch.velocityY
            touch.prevVelDelta = touch.velDelta

            touch.velocityX = (touch.eventPositionX - touch.samplePositionX) / sampleDt
            touch.velocityY = (touch.eventPositionY - touch.samplePositionY) / sampleDt
            touch.samplePositionX = touch.eventPositionX
            touch.samplePositionY = touch.eventPositionY
            touch.sampleTime = Math.max(touch.sampleTime + sampleTargetDt, time - sampleTargetDt)
            sampleDt = Math.min(Math.max(sampleDt - sampleTargetDt, 0.0), sampleTargetDt)

            const velX = touch.velocityX
            const velY = touch.velocityY
            const vel = Math.sqrt(velX*velX + velY*velY)
            touch.velDelta = (vel - touch.vel)
            touch.vel = vel
        }
        const sampleAlpha = sampleDt / sampleTargetDt
        const velX = touch.velocityX * sampleAlpha + touch.prevVelocityX * (1.0 - sampleAlpha)
        const velY = touch.velocityY * sampleAlpha + touch.prevVelocityY * (1.0 - sampleAlpha)

        const vel = Math.sqrt(velX*velX + velY*velY)
        const smoothing = clamp(1.0 - vel/400.0, 0.0, 1.0)

        const eventDt = time - touch.eventTime
        const targetLatency = Math.max(0.0, lerp(0.01, -0.01, smoothing))
        const latency = Math.max(targetLatency - eventDt * 0.5, 0.0)
        const predictDt = extrapolate ? (eventDt + latency) : 0.0
        const predictedEventX = touch.eventPositionX + velX * predictDt
        const predictedEventY = touch.eventPositionY + velY * predictDt

        const dt = time - touch.prevTime
        const damp = slowDamp ? eerp(0.55, 0.7, smoothing) : 0.55
        const alpha = 1.0 - Math.pow(damp, dt*60.0)
        touch.positionX = predictedEventX * alpha + touch.prevPositionX * (1.0 - alpha)
        touch.positionY = predictedEventY * alpha + touch.prevPositionY * (1.0 - alpha)
    }

    clampScale(scale: number): number {
        return clamp(scale, this.minScale, this.maxScale)
    }

    updateRelease() {
        const release = this.release
        if (!release) return

        const { viewBounds } = this
        const dt = releaseFixedDt

        release.prevX = release.nextX
        release.prevY = release.nextY

        release.nextX += release.velocityX * dt
        release.nextY += release.velocityY * dt

        const drag = 0.85
        release.velocityX *= drag
        release.velocityY *= drag

        // const decay = lerp(20.0, 200.0, clamp(-release.velDelta / 100.0, 0.0, 1.0))
        const decay = 30.0
        release.velocityX -= clamp(release.velocityX, -decay*dt, decay*dt)
        release.velocityY -= clamp(release.velocityY, -decay*dt, decay*dt)

        let inBounds = true
        const boundAlphaX = 0.35
        const boundAlphaY = 0.6
        const boundAbs = 200 * releaseFixedDt
        if (release.nextX < viewBounds.minX) {
            release.nextX = absLerp(release.nextX, viewBounds.minX, boundAlphaX, boundAbs)
            inBounds = false
        }
        if (release.nextX > viewBounds.maxX) {
            release.nextX = absLerp(release.nextX, viewBounds.maxX, boundAlphaX, boundAbs)
            inBounds = false
        }
        if (release.nextY < viewBounds.minY) {
            release.nextY = absLerp(release.nextY, viewBounds.minY, boundAlphaY, boundAbs)
            inBounds = false
        }
        if (release.nextY > viewBounds.maxY) {
            release.nextY = absLerp(release.nextY, viewBounds.maxY, boundAlphaY, boundAbs)
            inBounds = false
        }

        const vel = release.velocityX*release.velocityX + release.velocityY*release.velocityY
        if (vel < 0.01 && inBounds) {
            this.release = null
        }
    }

    updateAction() {
        const time = getTime()

        /*
        if (this.action?.action === "fade") {
            this.touches = []
        }
        */

        const { touches } = this
        for (const touch of touches) {
            this.updateTouchPosition(touch, time)
        }

        if (touches.length === 1) {
            const a = touches[0]!
            if (this.action?.action !== "pan" && this.action?.action !== "single-zoom") {
                const dx = a.positionX - a.startX
                const dy = a.positionY - a.startY
                const dist = Math.sqrt(dx*dx + dy*dy)

                let noClampDirection = 0
                if (this.action?.action === "fade") {
                    noClampDirection = this.action.horizontalDirection
                } else if (this.action?.action === "hold") {
                    noClampDirection = this.action.noClampDirection
                }

                const fromZoom = this.action?.action === "zoom"

                const threshold = 6
                if (dist > threshold || fromZoom) {
                    if (a.doubleTap && (!this.action || this.action.action === "hold")) {
                        this.action = {
                            action: "single-zoom",
                            pageX: a.positionX,
                            pageY: a.positionY,
                            localX: (a.positionX - this.viewport.x) / this.viewport.scale,
                            localY: (a.positionY - this.viewport.y) / this.viewport.scale,
                            scale: this.viewport.scale,
                        }
                    } else {
                        this.action = {
                            action: "pan",
                            scale: this.viewport.scale,
                            localX: (a.positionX - this.viewport.x) / this.viewport.scale,
                            localY: (a.positionY - this.viewport.y) / this.viewport.scale,
                            noClampDirection,
                            fromZoom,
                        }
                    }
                } else {
                    this.action = {
                        action: "hold",
                        noClampDirection,
                    }
                }
            }

            const { action } = this
            if (action?.action === "pan") {
                this.viewport.scale = this.clampScale(action.scale)
                this.viewport.x = a.positionX - action.localX * this.viewport.scale
                this.viewport.y = a.positionY - action.localY * this.viewport.scale
            } else if (action?.action === "single-zoom") {
                const delta = a.positionY - action.pageY
                const zoom = Math.pow(2.0, delta / 100.0)
                this.viewport.scale = this.clampScale(action.scale * zoom)
                this.viewport.x = action.pageX - action.localX * this.viewport.scale
                this.viewport.y = action.pageY - action.localY * this.viewport.scale
            }
        } else if (touches.length === 2) {
            const a = this.touches[0]!
            const b = this.touches[1]!

            const midX = (a.positionX + b.positionX) * 0.5
            const midY = (a.positionY + b.positionY) * 0.5
            const deltaX = b.positionX - a.positionX
            const deltaY = b.positionY - a.positionY
            const distance = Math.sqrt(deltaX*deltaX + deltaY*deltaY)

            if (this.action?.action !== "zoom") {
                this.action = {
                    action: "zoom",
                    scale: this.viewport.scale,
                    localX: (midX - this.viewport.x) / this.viewport.scale,
                    localY: (midY - this.viewport.y) / this.viewport.scale,
                    distance,
                }
            }

            const { action } = this
            const zoom = distance / action.distance
            this.viewport.scale = this.clampScale(action.scale * zoom)
            this.viewport.x = midX - action.localX * this.viewport.scale
            this.viewport.y = midY - action.localY * this.viewport.scale
        } else {
            const { action } = this
            if (action?.action === "fade") {
                const t = clamp((time - action.startTime) / action.duration, 0.0, 1.0)
                const u = 
                    action.direction === "out"
                        ? smoothStep(t * 0.5) * 2.0
                        // : smoothStep(t)
                        : smoothStep(0.5 + t * 0.5) * 2.0 - 1.0

                const { src, dst } = action
                this.viewport.x = lerp(src.x, dst.x, u)
                this.viewport.y = lerp(src.y, dst.y, u)
                this.viewport.scale = lerp(src.scale, dst.scale, u)

                this.fadeAlpha = action.direction === "out" ? u : 1.0 - u

                this.release = null
                if (t === 1) {
                    this.action = null
                    if (this.fadeEndCallbacks.length > 0) {
                        for (const cb of this.fadeEndCallbacks) {
                            cb()
                        }
                        this.fadeEndCallbacks = []
                    }
                }
            } else if (action?.action === "interpolate") {
                const t = clamp((time - action.startTime) / action.duration, 0.0, 1.0)
                const u = smoothStep(t)

                const { src, dst } = action
                this.viewport.x = lerp(src.x, dst.x, u)
                this.viewport.y = lerp(src.y, dst.y, u)
                this.viewport.scale = lerp(src.scale, dst.scale, u)

                this.release = null
                if (t === 1) {
                    this.action = null
                }
            } else {
                this.action = null
            }

            const release = this.release
            if (release) {
                const maxUpdates = 10
                let updateTime = release.updateTime
                let updateCount = 0
                while (updateTime < time) {
                    this.updateRelease()
                    updateTime += releaseFixedDt
                    if (++updateCount >= maxUpdates) {
                        updateTime = time
                    }
                }
                release.updateTime = updateTime
                const delta = time - release.updateTime + releaseFixedDt

                const releaseAlpha = delta / releaseFixedDt
                this.viewport.x = release.nextX * releaseAlpha + release.prevX * (1.0 - releaseAlpha)
                this.viewport.y = release.nextY * releaseAlpha + release.prevY * (1.0 - releaseAlpha)
            }
        }
    }

    clampEdge(amount: number, force: number): number {
        if (amount <= 0) return amount
        if (!isFinite(force)) return 0
        const weight = 0.001 * force
        const ratio = 1.5 * force
        return (1.0 - Math.exp(weight * -amount)) / (weight * ratio)
    }

    updateViewBounds() {
        const { parentWidth, parentHeight, viewBounds } = this

        const scale = this.viewport.scale
        const childWidth = this.contentWidth * scale
        const childHeight = this.contentHeight * scale
        const paddingWidth = childWidth * 0.0
        const paddingHeight = 0.0

        if (parentWidth < childWidth) {
            viewBounds.minX = parentWidth - childWidth - paddingWidth
            viewBounds.maxX = 0 + paddingWidth
        } else {
            // viewBounds.minX = 0 - paddingWidth
            // viewBounds.maxX = parentWidth - childWidth + paddingWidth
            viewBounds.minX = parentWidth * 0.5 - childWidth * 0.5
            viewBounds.maxX = viewBounds.minX
        }

        if (parentHeight < childHeight) {
            viewBounds.minY = parentHeight - childHeight - paddingHeight
            viewBounds.maxY = 0 + paddingHeight
        } else {
            // viewBounds.minY = 0 - paddingHeight
            // viewBounds.maxY = parentHeight - childHeight + paddingHeight
            viewBounds.minY = parentHeight * 0.5 - childHeight * 0.5
            viewBounds.maxY = viewBounds.minY
        }
    }

    clampViewport() {
        const { viewBounds, clampedViewport, viewport } = this
        this.updateViewBounds()

        if (this.action?.action !== "fade") {
            let noClampDirection = 0
            if (this.action?.action === "hold" || this.action?.action === "pan") {
                noClampDirection = this.action.noClampDirection
            }

            let yClampStrength = 1
            if (this.viewport.scale <= this.minScale * 1.05) {
                yClampStrength = Infinity
            }

            clampedViewport.x = viewport.x
            if (noClampDirection >= 0) {
                clampedViewport.x = viewBounds.minX - this.clampEdge(viewBounds.minX - clampedViewport.x, 1)
            }
            if (noClampDirection <= 0) {
                clampedViewport.x = this.clampEdge(clampedViewport.x - viewBounds.maxX, 1) + viewBounds.maxX
            }
            clampedViewport.y = viewBounds.minY - this.clampEdge(viewBounds.minY - viewport.y, yClampStrength)
            clampedViewport.y = this.clampEdge(clampedViewport.y - viewBounds.maxY, yClampStrength) + viewBounds.maxY
        } else {
            clampedViewport.x = viewport.x
            clampedViewport.y = viewport.y
        }

        clampedViewport.scale = viewport.scale

        if (this.action?.action === "pan") {
            this.pageChangeForce = clampedViewport.x - viewport.x
        } else {
            this.pageChangeForce = 0.0
        }
        if (this.action?.action !== "zoom" && this.action?.action !== "single-zoom" && !(this.action?.action === "pan" && this.action.fromZoom)) {
            this.pageChangeVisualForce = clamp(clampedViewport.x, viewBounds.minX, viewBounds.maxX) - clampedViewport.x
        } else {
            this.pageChangeVisualForce = 0.0
        }
    }

    setBounds(parentWidth: number, parentHeight: number, contentWidth: number, contentHeight: number) {
        this.parentWidth = parentWidth > 1 ? parentWidth : 1
        this.parentHeight = parentHeight > 1 ? parentHeight : 1
        this.contentWidth = contentWidth > 1 ? contentWidth : 1
        this.contentHeight = contentHeight > 1 ? contentHeight : 1

        const minScale = Math.min(this.parentWidth / this.contentWidth, this.parentHeight / this.contentHeight)
        const maxScale = Math.max(this.parentWidth / this.contentWidth, this.parentHeight / this.contentHeight)
        this.minScale = minScale
        this.maxScale = maxScale * 10.0
    }

    getResetViewportFor(width: number, height: number) {
        const { parentWidth, parentHeight } = this
        const scale = Math.min(parentWidth / width, parentHeight / height)
        return {
            x: parentWidth * 0.5 - width * 0.5 * scale,
            y: parentHeight * 0.5 - height * 0.5 * scale,
            scale: scale,
        }
    }

    getResetViewport() {
        const { contentWidth, contentHeight } = this
        return this.getResetViewportFor(contentWidth, contentHeight)
    }

    resetView() {
        const target = this.getResetViewport()
        this.action = null
        this.touches = []
        this.release = null
        this.viewport.x = target.x
        this.viewport.y = target.y
        this.viewport.scale = target.scale
        this.clampViewport()
        this.lastClickTime = -1
    }

    fadeInFrom(viewport: Viewport, direction: number, alpha: number) {
        const dst = { ...this.viewport }
        const src = { ...viewport }
        const duration = 0.2
        const time = getTime()

        this.action = {
            action: "fade",
            direction: "in",
            src, dst, duration,
            startTime: time,
            horizontalDirection: direction,
            srcAlpha: alpha,
        }

        this.requestAnimationFrame()
    }

    fadeIn(direction: number) {
        const src = {
            x: this.viewport.x - direction * 100,
            y: this.viewport.y,
            scale: this.viewport.scale,
        }
        this.fadeInFrom(src, direction, 0.0)
    }

    fadeOut(direction: number) {
        const src = { ...this.viewport }
        const dst = {
            x: src.x + direction * 100,
            y: src.y,
            scale: src.scale,
        }
        const duration = 0.15
        const time = getTime()

        this.action = {
            action: "fade",
            direction: "out",
            src, dst, duration,
            startTime: time,
            horizontalDirection: direction,
            srcAlpha: 1.0,
        }

        this.requestAnimationFrame()
    }

    doubleTapView(x: number, y: number) {
        if (this.action?.action === "fade") return

        const interpolateDuration = 0.2
        const resetViewport = this.getResetViewport()

        const time = getTime()
        const src = { ...this.viewport }
        const delta = 
            Math.abs(src.x - resetViewport.x) / this.parentWidth +
            Math.abs(src.y - resetViewport.y) / this.parentHeight +
            Math.abs(src.scale - resetViewport.scale) * 10.0
        if (delta > 0.001) {
            this.action = {
                action: "interpolate",
                src,
                dst: resetViewport,
                startTime: time,
                duration: interpolateDuration,
            }
        } else {
            const { parentWidth, parentHeight, contentWidth, contentHeight } = this
            const scale = Math.max(parentWidth / contentWidth, this.minScale * 2.0)
            const localWidth = parentWidth / (contentWidth * scale)
            const localHeight = parentHeight / (contentHeight * scale)
            let localX = 0.5
            let localY = 0.5
            if (localWidth < 1.0) {
                console.log(this.viewport.x)
                console.log(x)
                localX = clamp((x - this.viewport.x) / (contentWidth * this.viewport.scale), 0.5*localWidth, 1.0 - 0.5*localWidth)
                console.log(localX)
            }
            if (localHeight < 1.0) {
                localY = clamp((y - this.viewport.y) / (contentHeight * this.viewport.scale), 0.5*localHeight, 1.0 - 0.5*localHeight)
            }
            const dst = {
                x: parentWidth * 0.5 - contentWidth * localX * scale,
                y: parentHeight * 0.5 - contentHeight * localY * scale,
                scale,
            }
            this.action = {
                action: "interpolate",
                src,
                dst,
                startTime: time,
                duration: interpolateDuration,
            }
        }
    }

    requestAnimationFrame() {
        if (this.animationFrameToken === null) {
            this.animationFrameToken = window.requestAnimationFrame(this.onAnimationFrame)
        }
    }

    onFadeEnd(fn: () => void) {
        if (this.action?.action !== "fade") {
            fn()
        } else {
            this.fadeEndCallbacks.push(fn)
        }
    }

    onAnimationFrame = () => {
        this.animationFrameToken = null

        this.updateAction()
        this.clampViewport()
        this.viewportCallback(this.clampedViewport, this.fadeAlpha)

        if (this.action !== null || this.release !== null) {
            this.requestAnimationFrame()
        }
        if (process.env.NODE_ENV !== "production" && this.debug) {
            this.debug.render(this)
        }
    }

    getFadeAmount(): number {
        const action = this.action
        if (action?.action === "fade") {
            const time = getTime()
            const t = clamp((time - action.startTime) / action.duration, 0.0, 1.0)
            const u = 
                action.direction === "out"
                    ? smoothStep(t * 0.5) * 2.0
                    : smoothStep(0.5 + t * 0.5) * 2.0 - 1.0
            return 1.0 - u
        } else {
            return 0.0
        }
    }
}

class PanZoomDebugImp {
    canvas: HTMLCanvasElement
    ctx: CanvasRenderingContext2D
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        this.ctx = canvas.getContext("2d", {
            desynchronized: false,
        })!
    }

    render(panZoom: PanZoom) {
        const { canvas, ctx } = this
        const width = canvas.offsetWidth
        const height = canvas.offsetHeight
        if (canvas.width != width) canvas.width = width
        if (canvas.height != height) canvas.height = height

        ctx.fillStyle = "#000"
        ctx.fillRect(0, 0, width, height)

        const release = panZoom.release
        if (release) {
            const dt = getTime() - release.time

            const decay = clamp(-release.velDelta / 100.0, 2.0, 4.0)
            const factor = (1.0 - Math.exp(dt * -decay)) / decay

            ctx.fillStyle = "#888"
            ctx.beginPath()
            const posX = release.positionX + release.velocityX*factor
            const posY = release.positionY + release.velocityY*factor
            ctx.arc(posX, posY, 10.0, 0, 360)
            ctx.fill()

            ctx.font = "16px sans-serif"
            ctx.fillText(release.id.toString(), posX + 10, posY - 10)
        }

        for (const touch of panZoom.touches) {
            ctx.fillStyle = "#f00"
            ctx.beginPath()
            const posX = touch.positionX
            const posY = touch.positionY
            ctx.arc(posX, posY, 10.0, 0, 360)
            ctx.fill()

            ctx.font = "16px sans-serif"
            ctx.fillText(touch.id.toString(), posX + 10, posY - 10)
        }
    }
}

export const PanZoomDebug = (process.env.NODE_ENV === "production" ? null : PanZoomDebugImp) 
