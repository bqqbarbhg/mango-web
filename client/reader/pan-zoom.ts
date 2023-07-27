import { Viewport, doubleTapDistance, doubleTapThreshold } from "./common"

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

type ActionHold = {
    action: "hold"
}

type ActionPan = {
    action: "pan"
    localX: number
    localY: number
    scale: number
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

type ViewBounds = {
    minX: number
    minY: number
    maxX: number
    maxY: number
}

type Action = ActionHold | ActionPan | ActionZoom | ActionSingleZoom

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

    // Callbacks
    viewportCallback: (viewport: Viewport) => void = () => {}

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
        this.removeTouch(id)

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

        const time = getTime()
        this.updateTouchPosition(touch, time)
        touch.prevPositionX = touch.positionX
        touch.prevPositionY = touch.positionY
        touch.prevTime = time

        touch.eventPositionX = x
        touch.eventPositionY = y
        touch.eventTime = time

        this.requestAnimationFrame()
    }

    removeTouch(id: TouchId) {
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

                this.release = {
                    id: touch.id,
                    prevX: this.viewport.x,
                    prevY: this.viewport.y,
                    nextX: this.viewport.x,
                    nextY: this.viewport.y,
                    positionX: touch.positionX,
                    positionY: touch.positionY,
                    velocityX: hasRelease ? lerp(touch.prevVelocityX, touch.velocityX, sampleAlpha) : 0.0,
                    velocityY: hasRelease ? lerp(touch.prevVelocityY, touch.velocityY, sampleAlpha) : 0.0,
                    velDelta: hasRelease ? lerp(touch.prevVelDelta, touch.velDelta, sampleAlpha) : 0.0,
                    updateTime: time,
                    time,
                }

                this.touches.splice(index, 1)
                break
            }
            index++
        }
        this.lastReleaseTime = time

        this.requestAnimationFrame()
    }

    onMouseDown = (e: MouseEvent) => {
        e.preventDefault()
        if (e.button === 0) {
            this.addTouch("mouse", e.pageX, e.pageY)
        }
    }

    onMouseMove = (e: MouseEvent) => {
        e.preventDefault()
        this.updateTouch("mouse", e.pageX, e.pageY)
    }

    onMouseUp = (e: MouseEvent) => {
        e.preventDefault()
        if (e.button === 0) {
            this.removeTouch("mouse")
        }
    }

    onMouseLeave = (e: MouseEvent) => {
        e.preventDefault()
        this.removeTouch("mouse")
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
            this.removeTouch(touch.identifier)
        }
    }

    onTouchCancel = (e: TouchEvent) => {
        e.preventDefault()
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i]!
            this.removeTouch(touch.identifier)
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
        return scale
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
        const boundAlpha = 0.5
        const boundAbs = 500 * releaseFixedDt
        if (release.nextX < viewBounds.minX) {
            release.nextX = absLerp(release.nextX, viewBounds.minX, boundAlpha, boundAbs)
            inBounds = false
        }
        if (release.nextX > viewBounds.maxX) {
            release.nextX = absLerp(release.nextX, viewBounds.maxX, boundAlpha, boundAbs)
            inBounds = false
        }
        if (release.nextY < viewBounds.minY) {
            release.nextY = absLerp(release.nextY, viewBounds.minY, boundAlpha, boundAbs)
            inBounds = false
        }
        if (release.nextY > viewBounds.maxY) {
            release.nextY = absLerp(release.nextY, viewBounds.maxY, boundAlpha, boundAbs)
            inBounds = false
        }

        const vel = release.velocityX*release.velocityX + release.velocityY*release.velocityY
        if (vel < 0.01 && inBounds) {
            this.release = null
        }
    }

    updateAction() {
        const { touches } = this
        const time = getTime()
        for (const touch of touches) {
            this.updateTouchPosition(touch, time)
        }

        if (touches.length === 1) {
            const a = touches[0]!
            if (this.action?.action !== "pan" && this.action?.action !== "single-zoom") {
                const dx = a.positionX - a.startX
                const dy = a.positionY - a.startY
                const dist = Math.sqrt(dx*dx + dy*dy)

                const threshold = 6
                if (dist > threshold) {
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
                        }
                    }
                } else {
                    this.action = {
                        action: "hold",
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
            this.action = null

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

    clampEdge(amount: number): number {
        if (amount <= 0) return amount
        const weight = 0.001
        const ratio = 1.5
        return (1.0 - Math.exp(weight * -amount)) / (weight * ratio)
    }

    updateViewBounds() {
        const { parentWidth, parentHeight, viewBounds } = this

        const scale = this.viewport.scale
        const childWidth = this.contentWidth * scale
        const childHeight = this.contentHeight * scale
        const paddingWidth = childWidth * 0.5
        const paddingHeight = childHeight * 0.5

        if (parentWidth < childWidth) {
            viewBounds.minX = parentWidth - childWidth - paddingWidth
            viewBounds.maxX = 0 + paddingWidth
        } else {
            viewBounds.minX = 0 - paddingWidth
            viewBounds.maxX = parentWidth - childWidth + paddingWidth
        }

        if (parentHeight < childHeight) {
            viewBounds.minY = parentHeight - childHeight - paddingHeight
            viewBounds.maxY = 0 + paddingHeight
        } else {
            viewBounds.minY = 0 - paddingHeight
            viewBounds.maxY = parentHeight - childHeight + paddingHeight
        }
        console.log(viewBounds)
    }

    clampViewport() {
        const { viewBounds, clampedViewport, viewport } = this
        this.updateViewBounds()

        clampedViewport.x = viewBounds.minX - this.clampEdge(viewBounds.minX - viewport.x)
        clampedViewport.x = this.clampEdge(clampedViewport.x - viewBounds.maxX) + viewBounds.maxX
        clampedViewport.y = viewport.y
        // console.log(clampedViewport.x - viewBounds.maxY)
        clampedViewport.y = viewBounds.minY - this.clampEdge(viewBounds.minY - viewport.y)
        clampedViewport.y = this.clampEdge(clampedViewport.y - viewBounds.maxY) + viewBounds.maxY

        clampedViewport.scale = viewport.scale
    }

    setBounds(parentWidth: number, parentHeight: number, contentWidth: number, contentHeight: number) {
        this.parentWidth = parentWidth > 1 ? parentWidth : 1
        this.parentHeight = parentHeight > 1 ? parentHeight : 1
        this.contentWidth = contentWidth > 1 ? contentWidth : 1
        this.contentHeight = contentHeight > 1 ? contentHeight : 1
    }

    resetView() {
        const { parentWidth, parentHeight, contentWidth, contentHeight } = this

        const scale = Math.min(parentWidth / contentWidth, parentHeight / contentHeight)
        this.viewport.x = parentWidth * 0.5 - contentWidth * 0.5 * scale
        this.viewport.y = parentHeight * 0.5 - contentHeight * 0.5 * scale
        this.viewport.scale = scale
        this.clampViewport()
    }

    requestAnimationFrame() {
        if (this.animationFrameToken === null) {
            this.animationFrameToken = window.requestAnimationFrame(this.onAnimationFrame)
        }
    }

    onAnimationFrame = () => {
        this.animationFrameToken = null

        this.updateAction()
        this.clampViewport()
        this.viewportCallback(this.clampedViewport)

        if (this.action !== null || this.release !== null) {
            this.requestAnimationFrame()
        }
        if (process.env.NODE_ENV !== "production" && this.debug) {
            this.debug.render(this)
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
            console.log(factor)

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
