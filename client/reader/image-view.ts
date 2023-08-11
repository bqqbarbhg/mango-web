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

export type ImageViewScene = {
    images: ImageViewImage[]
}

export default class ImageView {
    //viewport: Viewport = { x: 0, y: 0, scale: 1 }
    //fadeAlpha: number = 0.0
    scene: ImageViewScene = { images: [] }
    mipCache: MipCache | null

    /*
    setViewport(viewport: Viewport): boolean {
        const dx = this.viewport.x - viewport.x
        const dy = this.viewport.y - viewport.y
        const ds = this.viewport.scale - viewport.scale

        if (Math.abs(dx) >= 0.1 || Math.abs(dy) >= 0.1 || Math.abs(ds) >= 0.001) {
            this.viewport.x = viewport.x
            this.viewport.y = viewport.y
            this.viewport.scale = viewport.scale
            return true
        } else {
            return false
        }
    }

    setFade(fade: number): boolean {
        if (this.fadeAlpha !== fade) {
            this.fadeAlpha = fade
            return true
        } else {
            return false
        }
    }
*/

    setMipCache(cache: MipCache) { this.mipCache = cache }
    setScene(scene: ImageViewScene) { this.scene = scene }
    getImageFormat(): string | null { return null }
    parentResized() { }
    // setImage(format: string, image: any) { }
    render() { }
    dispose() { }
}
