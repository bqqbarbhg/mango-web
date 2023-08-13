import { Component, useState, unwrap, useEffect, useRef, createState } from "kaiku";
import { ClickInfo, DragInfo, PanZoom, ReleaseInfo } from "../../reader/pan-zoom"
import { Viewport } from "../../reader/common";
import ImageView, { ImageViewHighlight, ImageViewScene } from "../../reader/image-view";
import ImageViewWebGL from "../../reader/image-view-webgl";
// import ImageViewCanvas from "../../reader/image-view-canvas";
import { BottomBar } from "./bottom-bar";
import { globalState, pushError } from "../../state";
import { CancelError, CancelToken, fetchXHR } from "../../utils/fetch-xhr";
import { parseKtx, ktxJson } from "../../utils/ktx";
import { MipCache } from "../../reader/mip-cache";
import { Overlay } from "../overlay/overlay";
import { OverlayManager } from "../../reader/overlay-manager";
import { sourceGetJson } from "../../utils/source";
import * as V from "../../utils/validation"
import * as PJ from "../../reader/page-json"
import { immutable } from "kaiku"
import { apiCall } from "../../utils/api";

type Props = { }
type State = {
    bottomBarVisible: boolean
    ready: boolean
}
export class Reader extends Component<Props, State> {
    panZoom: PanZoom | null = null
    parentRef = useRef<HTMLElement>()
    imageView: ImageView
    mipCache: MipCache | null = null
    image: HTMLImageElement
    initialized = false
    prevPage = -1
    fadeDirection = 0
    imageFormat: string | null = null
    pageCancel = new CancelToken()
    parentWidth: number = 1
    parentHeight: number = 1
    contentWidth: number = 1
    contentHeight: number = 1
    interpolateFromViewport: Viewport | null = null
    leftViewport: Viewport = { x: 0, y: 0, scale: 1 }
    rightViewport: Viewport = { x: 0, y: 0, scale: 1 }
    leftViewportFade: Viewport = { x: 0, y: 0, scale: 1 }
    rightViewportFade: Viewport = { x: 0, y: 0, scale: 1 }
    overlayManager: OverlayManager
    highlights: ImageViewHighlight[] = []
    pageJsonTimeout: number | null = null
    pageReadTimeout: number | null = null

    constructor(props: Props) {
        super(props)
        this.state = createState({
            bottomBarVisible: false,
            ready: false,
        })

        this.image = new Image()
        this.image.crossOrigin = "anonymous"

        this.overlayManager = new OverlayManager(globalState.user!.overlay!)
        this.overlayManager.highlightCallback = this.onHighlight

        useEffect(() => {
            if (this.initialized) return

            const parent: HTMLElement | null = this.parentRef.current ? unwrap(this.parentRef.current as any) : null
            if (parent) {
                this.panZoom = new PanZoom(parent)
                this.imageView = new ImageViewWebGL(parent)
                this.initialized = true

                const updateSize = () => {
                    this.parentWidth = parent.offsetWidth
                    this.parentHeight = parent.offsetHeight
                    this.updateBounds()
                    this.imageView.parentResized()
                    this.panZoom?.resetView()
                    this.panZoom?.requestAnimationFrame()
                }

                this.imageFormat = this.imageView.getImageFormat()
                const observer = new ResizeObserver(updateSize)
                observer.observe(parent)

                this.panZoom.viewportCallback = this.onViewport

                this.panZoom.clickCallback = this.onClick
                this.panZoom.releaseCallback = this.onRelease

                this.panZoom.dragStartCallback = this.onDragStart
                this.panZoom.dragMoveCallback = this.onDragMove
                this.panZoom.dragEndCallback = this.onDragEnd

                this.panZoom.clickTimeoutCallback = () => {
                    this.state.bottomBarVisible = !this.state.bottomBarVisible
                    return true
                }
                updateSize()

                this.state.ready = true
            }
        })

        useEffect(() => {
            if (!this.state.ready) return
            const currentVolume = globalState.user?.currentVolume
            if (!currentVolume) return

            if (this.mipCache === null) {
                const format = this.imageView.getImageFormat() ?? "png"
                this.mipCache = new MipCache(currentVolume.source,
                    currentVolume.path, currentVolume.content, format)
                this.imageView.setMipCache(this.mipCache)
                this.mipCache.loadCallback = this.onMipLoad
            }

            this.mipCache.setPreloadPage(currentVolume.currentPage)
            this.loadPage(currentVolume.currentPage)
        })
    }

    updateBounds() {
        this.panZoom!.setBounds(this.parentWidth, this.parentHeight, this.contentWidth, this.contentHeight)
    }

    async loadPageJson(page: number) {
        const user = globalState.user
        if (!user) return
        const { currentVolume, overlay } = user
        if (!currentVolume || !overlay) return

        try {
            const pageNumber = (page + 1).toString().padStart(3, "0")
            const path = `${currentVolume.path}/page${pageNumber}.json`
            const json = await sourceGetJson(currentVolume.source, path)

            const overlayPage = await PJ.validatePageAsync(json)

            if (currentVolume.currentPage === page) {
                overlay.page = immutable(overlayPage)
                overlay.hint = null
                overlay.hintId = -1
                overlay.translation = ""
            }
        } catch (err) {
            pushError(`Failed to load page ${page+1} translations`, err)
        }
    }

    async markPageRead(page: number) {
        const currentVolume = globalState.user?.currentVolume
        if (!currentVolume) return
        if (currentVolume.currentPage !== page) return

        const pageBase = Math.floor(page / 32)
        const pageBit = 1 << (page % 32)
        while (currentVolume.readPages.length <= pageBase) {
            currentVolume.readPages.push(0)
        }
        currentVolume.readPages[pageBase] |= pageBit

        try {
            await apiCall("POST /read/:*path", {
                sourceUuid: currentVolume.source.uuid,
                path: currentVolume.path,
                page: page + 1,
            })
        } catch (err) {
            pushError("Failed to update status", err, { deduplicate: true })
        }
    }

    async loadPage(page: number) {
        const user = globalState.user
        if (!user) return
        const { currentVolume, overlay } = user
        if (!currentVolume || !overlay) return

        const { prevPage, image } = this
        if (page === prevPage) return
        this.prevPage = page

        this.overlayManager.clearOverlay()

        if (this.pageJsonTimeout) {
            window.clearTimeout(this.pageJsonTimeout)
        }
        if (this.pageReadTimeout) {
            window.clearTimeout(this.pageReadTimeout)
        }

        this.pageJsonTimeout = window.setTimeout(() => this.loadPageJson(page), 300)
        this.pageReadTimeout = window.setTimeout(() => this.markPageRead(page), 800)

        const pageInfo = currentVolume.content.pages[page]!
        this.contentWidth = pageInfo.width
        this.contentHeight = pageInfo.height
        this.updateBounds()

        if (this.interpolateFromViewport) {
            this.panZoom!.resetView()
            this.panZoom!.fadeInFrom(this.interpolateFromViewport, this.fadeDirection, 0.0)
            this.interpolateFromViewport = null
        } else {
            this.panZoom!.resetView()
        }

        this.panZoom?.requestAnimationFrame()
    }

    componentDidMount(): void {
        window.addEventListener("keydown", this.onKeyDown)
    }

    componentWillUnmount(): void {
        window.removeEventListener("keydown", this.onKeyDown)
        this.imageView?.dispose()
    }

    moveToPreviousPage(): boolean {
        const currentVolume = globalState.user?.currentVolume
        const { panZoom } = this
        if (!currentVolume || !panZoom) return false

        if (currentVolume.currentPage > 0) {
            currentVolume.currentPage -= 1
            this.interpolateFromViewport = this.leftViewport
            this.fadeDirection = -1
            this.rightViewportFade.x = panZoom.clampedViewport.x
            this.rightViewportFade.y = panZoom.clampedViewport.y
            this.rightViewportFade.scale = panZoom.clampedViewport.scale
            return true
        } else {
            return false
        }
    }

    moveToNextPage(): boolean {
        const currentVolume = globalState.user?.currentVolume
        const { panZoom } = this
        if (!currentVolume || !panZoom) return false

        if (currentVolume.currentPage < currentVolume.content.pages.length - 1) {
            currentVolume.currentPage += 1
            this.interpolateFromViewport = this.rightViewport
            this.fadeDirection = +1
            this.leftViewportFade.x = panZoom.clampedViewport.x
            this.leftViewportFade.y = panZoom.clampedViewport.y
            this.leftViewportFade.scale = panZoom.clampedViewport.scale
            return true
        } else {
            return false
        }
    }

    onMipLoad = () => {
        this.imageView.render()
    }

    onHighlight = (aabbs: PJ.AABB[]) => {
        const padding = 0
        this.highlights.length = 0
        for (const aabb of aabbs) {
            this.highlights.push({
                x: aabb.min[0] - padding,
                y: aabb.min[1] - padding,
                w: aabb.max[0] - aabb.min[0] + padding * 2,
                h: aabb.max[1] - aabb.min[1] + padding * 2,
            })
        }
        this.imageView.setHighlights(this.highlights)
        this.panZoom?.requestAnimationFrame()
    }

    onClick = (click: ClickInfo): boolean => {
        const { panZoom } = this
        const currentVolume = globalState.user?.currentVolume
        if (!currentVolume || !panZoom) return false

        const localPos = { x: click.x, y: click.y }
        if (this.overlayManager.onImageClick(localPos)) {
            this.state.bottomBarVisible = false
            return true
        }

        return false
    }

    onRelease = (release: ReleaseInfo): boolean => {
        const currentVolume = globalState.user?.currentVolume
        const { panZoom }  = this
        if (!currentVolume || !panZoom) return false
        if (release.fromZoom) return false

        const releaseScale = -1.0 / 10.0

        const rawPageForce = panZoom.pageChangeForce
        const pageForce = panZoom.pageChangeForce + panZoom.pageChangeReleaseForce * releaseScale

        let forceLimit = 90
        let rawLimit = 70
        if (panZoom.viewport.scale <= panZoom.minScale * 1.05) {
            rawLimit = 0
        }
        if (panZoom.getFadeAmount() > 0) {
            rawLimit = 0
        }

        if (rawPageForce <= -rawLimit && pageForce <= -forceLimit) {
            return this.moveToPreviousPage()
        } else if (rawPageForce >= rawLimit && pageForce >= forceLimit) {
            return this.moveToNextPage()
        }

        return false
    }

    onDragStart = (info: DragInfo) => {
        return this.overlayManager.dragStart({ x: info.x, y: info.y })
    }

    onDragMove = (info: DragInfo) => {
        this.overlayManager.dragMove({ x: info.x, y: info.y })
    }

    onDragEnd = (info: DragInfo, cancel: boolean) => {
        this.overlayManager.dragEnd()
    }

    onKeyDown = (e: KeyboardEvent) => {
        if (e.repeat) return
        if (e.code === "ArrowLeft") {
            this.moveToPreviousPage()
            e.preventDefault()
        } else if (e.code === "ArrowRight") {
            this.moveToNextPage()
            e.preventDefault()
        }
    }

    onViewport = (viewport: Viewport, _: number) => {
        const currentVolume = globalState.user?.currentVolume
        const { panZoom } = this
        if (!currentVolume || !panZoom) return

        const page = currentVolume.content.pages[this.prevPage]!
        const nextPage = currentVolume.content.pages[this.prevPage + 1]
        const prevPage = currentVolume.content.pages[this.prevPage - 1]

        const fadeAmount = panZoom.getFadeAmount()
        const leftMinFade = this.fadeDirection > 0 ? fadeAmount : 0
        const rightMinFade =  this.fadeDirection < 0 ? fadeAmount : 0

        const prevViewport = leftMinFade > 0.0 ? this.leftViewportFade : (prevPage ? panZoom.getResetViewportFor(prevPage.width, prevPage.height) : null)
        const nextViewport = rightMinFade > 0.0 ? this.rightViewportFade : (nextPage ? panZoom.getResetViewportFor(nextPage.width, nextPage.height) : null)

        const pageChangeForce = panZoom.pageChangeForce
        const pageChangeVisualForce = panZoom.pageChangeHideVisual ? 0.0 : panZoom.pageChangeVisualForce

        if (prevPage) {
            this.leftViewport.x = viewport.x - (prevPage.width * prevViewport!.scale + 30)
            this.leftViewport.y = prevViewport!.y
            this.leftViewport.scale = prevViewport!.scale
        }

        if (nextPage) {
            this.rightViewport.x = viewport.x + page.width * viewport.scale + 30
            this.rightViewport.y = nextViewport!.y
            this.rightViewport.scale = nextViewport!.scale
        }

        this.overlayManager.updateViewport(viewport)

        const scene: ImageViewScene = {
            images: [
                {
                    x: viewport.x,
                    y: viewport.y,
                    scale: viewport.scale,
                    pageIndex: this.prevPage,
                    imageWidth: page.width,
                    imageHeight: page.height,
                    alpha: 1,
                },
                !nextPage ? [] : {
                    x: this.rightViewport.x,
                    y: this.rightViewport.y,
                    scale: this.rightViewport.scale,
                    pageIndex: this.prevPage + 1,
                    imageWidth: nextPage.width,
                    imageHeight: nextPage.height,
                    alpha: Math.min(1, Math.max(rightMinFade, pageChangeVisualForce / 200.0)),
                },
                !prevPage ? [] : {
                    x: this.leftViewport.x,
                    y: this.leftViewport.y,
                    scale: this.leftViewport.scale,
                    pageIndex: this.prevPage - 1,
                    imageWidth: prevPage.width,
                    imageHeight: prevPage.height,
                    alpha: Math.min(1, Math.max(leftMinFade, pageChangeVisualForce / -200.0)),
                },
            ].flat(),
            higlightViewport: viewport,
        }
        this.imageView.setScene(scene)
        this.imageView.render()

        if (this.imageView.renderRequested) {
            this.imageView.renderRequested = false
            this.panZoom?.requestAnimationFrame()
        }
    }

    render() {
        return <>
            <BottomBar visible={this.state.bottomBarVisible} />
            <Overlay />
            <div ref={this.parentRef} className="viewer-parent">
            </div>
        </>
    }
}
