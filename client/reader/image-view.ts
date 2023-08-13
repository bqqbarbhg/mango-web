import { Viewport } from "./common";
import { MipCache } from "./mip-cache";

export type ImageViewImage = {
    x: number
    y: number
    scale: number
    imageWidth: number
    imageHeight: number
    pageIndex: number
    alpha: number
}

export type ImageViewHighlight = {
    x: number
    y: number
    w: number
    h: number
}

export type ImageViewViewport = {
    x: number
    y: number
    scale: number
}

export type ImageViewScene = {
    images: ImageViewImage[]
    higlightViewport: ImageViewViewport
}

export default class ImageView {
    //viewport: Viewport = { x: 0, y: 0, scale: 1 }
    //fadeAlpha: number = 0.0
    scene: ImageViewScene = {
        images: [],
        higlightViewport: { x: 0, y: 0, scale: 1 },
    }
    mipCache: MipCache | null
    renderRequested: boolean = false

    requestRender() { this.renderRequested = true }
    setMipCache(cache: MipCache) { this.mipCache = cache }
    setScene(scene: ImageViewScene) { this.scene = scene }
    setHighlights(highlights: ImageViewHighlight[]) { }
    getImageFormat(): string | null { return null }
    parentResized() { }
    // setImage(format: string, image: any) { }
    render() { }
    dispose() { }
}
