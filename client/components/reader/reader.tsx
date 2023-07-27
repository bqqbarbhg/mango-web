import { Component, useState, unwrap, useEffect, useRef } from "kaiku";
import { PanZoom } from "../../reader/pan-zoom"
import { Viewport } from "../../reader/common";
import ImageView from "../../reader/image-view";
import ImageViewWebGL from "../../reader/image-view-webgl";
import ImageViewCanvas from "../../reader/image-view-canvas";

type Props = { }
export class Reader extends Component<Props> {
    panZoom: PanZoom | null = null
    parentRef = useRef<HTMLElement>()
    imageView: ImageView
    initialized = false

    constructor(props: Props) {
        super(props)
        useEffect(() => {
            if (this.initialized) return

            const parent: HTMLElement | null = this.parentRef.current ? unwrap(this.parentRef.current as any) : null
            if (parent) {
                this.panZoom = new PanZoom(parent)
                this.imageView = new ImageViewWebGL(parent)
                this.initialized = true

                const image = new Image()

                const updateSize = () => {
                    const parentWidth = parent.offsetWidth
                    const parentHeight = parent.offsetHeight
                    const contentWidth = image.width
                    const contentHeight = image.height
                    this.imageView.parentResized()
                    this.panZoom!.setBounds(parentWidth, parentHeight, contentWidth, contentHeight)
                }

                image.src = "/test-image.png"
                image.addEventListener("load", () => {
                    console.log("LOAD")
                    updateSize()
                    this.panZoom!.resetView()
                    this.imageView.setViewport(this.panZoom!.viewport)
                    this.imageView.setImage(image)
                    this.imageView.render()
                })

                const observer = new ResizeObserver(updateSize)
                observer.observe(parent)

                this.panZoom.viewportCallback = this.onViewport
                updateSize()
            }
        })
    }

    componentDidMount(): void {
    }

    componentWillUnmount(): void {
        this.imageView?.dispose()
    }

    onViewport = (viewport: Viewport) => {
        const invalidated = this.imageView.setViewport(viewport)
        if (invalidated) {
            this.imageView.render()
        }
    }

    render(props: Props) {
        return <div ref={this.parentRef} className="viewer-parent">
        </div>
    }
}
