import { Viewport } from "./common";

export default class ImageView {
    viewport: Viewport = { x: 0, y: 0, scale: 1 }

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

    parentResized() { }
    setImage(image: HTMLImageElement) { }
    render() { }
    dispose() { }
}
