import { Component, useState, unwrap, useEffect, useRef, createState } from "kaiku";
import { ClickInfo, PanZoom, ReleaseInfo } from "../../reader/pan-zoom"
import { Viewport } from "../../reader/common";
import ImageView, { ImageViewScene } from "../../reader/image-view";
import ImageViewWebGL from "../../reader/image-view-webgl";
// import ImageViewCanvas from "../../reader/image-view-canvas";
import { BottomBar } from "./bottom-bar";
import { globalState, pushError } from "../../state";
import { CancelError, CancelToken, fetchXHR } from "../../utils/fetch-xhr";
import { parseKtx, ktxJson } from "../../utils/ktx";
import { MipCache } from "../../reader/mip-cache";

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

    constructor(props: Props) {
        super(props)
        this.state = createState({
            bottomBarVisible: false,
            ready: false,
        })

        this.image = new Image()
        this.image.crossOrigin = "anonymous"

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

                /*
                this.image.addEventListener("load", () => {
                    this.panZoom!.onFadeEnd(() => {
                        updateSize()
                        this.panZoom!.resetView()
                        this.imageView.setViewport(this.panZoom!.viewport)
                        if (this.fadeDirection !== 0) {
                            this.panZoom!.fadeIn(this.fadeDirection)
                        }
                        this.imageView.render()
                    })
                })
                */

                this.imageFormat = this.imageView.getImageFormat()
                const observer = new ResizeObserver(updateSize)
                observer.observe(parent)

                this.panZoom.viewportCallback = this.onViewport

                this.panZoom.clickCallback = this.onClick
                this.panZoom.releaseCallback = this.onRelease

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

            this.mipCache.preloadPage = currentVolume.currentPage
            this.loadPage(currentVolume.currentPage)
        })
    }

    updateBounds() {
        this.panZoom!.setBounds(this.parentWidth, this.parentHeight, this.contentWidth, this.contentHeight)
    }

    async loadPage(page: number) {
        const currentVolume = globalState.user?.currentVolume
        if (!currentVolume) return

        const { prevPage, image } = this
        if (page === prevPage) return
        this.prevPage = page

        /*
        if (prevPage >= 0) {
            const direction = page > prevPage ? -1 : 1
            this.fadeDirection = direction
            // this.panZoom!.fadeOut(direction)
        }
        */

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

        /*
        const pageNumber = (page + 1).toString().padStart(3, "0")
        const ext = this.imageFormat ?? currentVolume.content.imageFormat
        const imageUrl = `${currentVolume.source.url}/${currentVolume.path}/page${pageNumber}.${ext}`

        try {
            const result = await fetchXHR(imageUrl, {
                cancel: this.pageCancel,
            })

            const ktx = parseKtx(result, {
                keyValueTypes: {
                    "mango:json": ktxJson,
                },
            })

            const mangoJson = ktx.keyValuePairs.find(kv => kv.key === "mango:json")
            const originalSize = mangoJson?.value.originalSize
            this.contentWidth = originalSize.x ?? ktx.header.pixelWidth
            this.contentHeight = originalSize.y ?? ktx.header.pixelHeight
            this.updateBounds()

            this.panZoom!.onFadeEnd(() => {
                this.imageView.setImage("ktx", ktx)
                this.panZoom!.resetView()
                this.imageView.setViewport(this.panZoom!.viewport)
                if (this.fadeDirection !== 0) {
                    this.panZoom!.fadeIn(this.fadeDirection)
                }
                this.imageView.render()
            })
        } catch (err) {
            if (err instanceof CancelError) {
                // Nop
            } else {
                pushError("Failed to load page", err)
            }
        }
        */
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

    onClick = (click: ClickInfo): boolean => {
        const currentVolume = globalState.user?.currentVolume
        if (!currentVolume) return false

        /*
        if (click.doubleClick) {
            const viewport = this.panZoom!.clampedViewport
            const parentWidth = this.panZoom!.parentWidth
            const pageX = click.x * viewport.scale + viewport.x
            const page = currentVolume.currentPage
            if (pageX < parentWidth * 0.33 && page > 0) {
                currentVolume.currentPage = page - 1
                return true
            } else if (pageX > parentWidth * 0.66 && page < currentVolume.content.pages.length) {
                currentVolume.currentPage = page + 1
                return true
            }
        }
        */

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
        /*
        let invalidated = this.imageView.setViewport(viewport)
        invalidated = this.imageView.setFade(fadeAmount) ? true : invalidated
        if (invalidated) {
            this.imageView.render()
        }
        */
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
            ].flat()
        }
        this.imageView.setScene(scene)
        this.imageView.render()
    }

    render(props: Props) {
        return <>
            <BottomBar visible={this.state.bottomBarVisible} />
            <div ref={this.parentRef} className="viewer-parent">
            </div>
        </>
    }
}
