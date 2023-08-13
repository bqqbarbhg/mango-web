import { immutable } from "kaiku"
import * as PJ from "./page-json"
import { globalState } from "../state"

type Point = {
    x: number
    y: number
}

type Viewport = {
    x: number
    y: number
    scale: number
}

type Selection = {
    paraIx: number
    symBegin: number
    symEnd: number
}

function aabbDist(aabb: PJ.AABB, pos: Point) {
    const cx = Math.min(Math.max(pos.x, aabb.min[0]), aabb.max[0])
    const cy = Math.min(Math.max(pos.y, aabb.min[1]), aabb.max[1])
    const dx = pos.x - cx
    const dy = pos.y - cy
    return dx*dx + dy*dy
}

function getNearestSymbol(page: PJ.Page, pos: Point, distance=20.0) {
    let bestDist = distance*distance
    let bestParaIndex = -1
    let bestSymIndex = -1
    let paraIndex = 0
    for (const para of page.paragraphs) {
        let symIndex = 0
        for (const sym of para.symbols) {
            let dist = aabbDist(sym.aabb, pos)
            if (dist < bestDist) {
                bestParaIndex = paraIndex
                bestSymIndex = symIndex
                bestDist = dist
            }
            symIndex += 1
        }
        paraIndex += 1
    }

    if (bestParaIndex < 0) return null
    return { paraIx: bestParaIndex, symIx: bestSymIndex, distance: Math.sqrt(bestDist) }
}

function getCluster(page: PJ.Page, paraIx: number) {
    for (const cluster of page.clusters) {
        if (cluster.paragraphs.includes(paraIx)) {
            return cluster
        }
    }
}

function getHint(paragraph: PJ.Paragraph, symIx: number) {
    for (const hint of paragraph.hints) {
        if (symIx >= hint.begin && symIx < hint.end) {
            return hint
        }
    }
    return null
}

function getAltHint(paragraph: PJ.Paragraph, symBegin: number, symEnd: number) {
    for (const hint of paragraph.alt_hints) {
        if (symBegin == hint.begin && symEnd == hint.end) {
            return hint
        }
    }
    return null
}

function getClusterRects(page: PJ.Page, cluster: PJ.Cluster) {
    let rects = []
    for (const paraIx of cluster.paragraphs) {
        for (const sym of page.paragraphs[paraIx]!.symbols) {
            rects.push(sym.aabb)
        }
    }
    return rects
}

function getSelectionRects(page: PJ.Page, selection: Selection) {
    let rects = []
    const paragraph = page.paragraphs[selection.paraIx]!
    for (let i = selection.symBegin; i < selection.symEnd; i++) {
        const sym = paragraph.symbols[i]!
        rects.push(sym.aabb)
    }
    return rects
}

function getSelectionTarget(page: PJ.Page, selection: Selection) {
    const paragraph = page.paragraphs[selection.paraIx]!
    let minX = +Infinity
    let maxX = -Infinity
    let minY = +Infinity
    let maxY = -Infinity
    for (let i = selection.symBegin; i < selection.symEnd; i++) {
        const aabb = paragraph.symbols[i]!.aabb
        minX = Math.min(minX, aabb.min[0])
        maxX = Math.max(maxX, aabb.max[0])
        minY = Math.min(minY, aabb.min[1])
        maxY = Math.max(maxY, aabb.max[1])
    }
    return {
        x: (minX + maxX) * 0.5,
        y: (minY + maxY) * 0.5,
        width: (maxX - minX) * 0.5,
        height: (maxY - minY) * 0.5,
        visible: true,
    }
}

export type OverlayState = {
    page: PJ.Page | null
    hint: PJ.Hint | null
    hintId: number
    translation: string | null
    rootRef: { current: HTMLElement | null }
}

export class OverlayManager {
    clickTime = 0
    selection: Selection | null = null
    dragSelection : Selection | null = null
    dragSelectionBegin = false
    dragSelectionEnd = false
    dragTapSymbolIx = -1
    viewport: Viewport = { x: 0, y: 0, scale: 1 }
    state: OverlayState
    prevClickPos: Point = { x: 0, y: 0 }
    rootOnLeft = false
    rootOnTop = false
    rootVertical = false
    rootPos = { x: 0, y: 0 }
    rootSize = { x: 0, y: 0 }
    rootVisible = false
    rootTarget = { x: 0, y: 0, width: 0, height: 0, visible: false }

    highlightCallback: (aabbs: PJ.AABB[]) => void = () => {}

    constructor(state: OverlayState) {
        this.state = state
    }

    setState(patch: Partial<OverlayState>) {
        for (const key in patch) {
            (this.state as any)[key] = (patch as any)[key]
        }
    }

    isDoubleClickNear(a: Point, b: Point) {
        if (a === null || b === null) return false
        const dx = (a.x - b.x) * this.viewport.scale
        const dy = (a.y - b.y) * this.viewport.scale
        const dist = 30
        return dx*dx + dy*dy < dist*dist
    }

    updateHighlights(aabbs: PJ.AABB[]) {
        this.highlightCallback(aabbs)
    }

    onImageClick = (pos: Point): boolean => {
        const { page } = this.state
        if (!page) return false

        let time = new Date().getTime()
        let doubleClick = (time - this.clickTime < 200) && this.isDoubleClickNear(pos, this.prevClickPos)
        this.clickTime = doubleClick ? -1 : time
        this.prevClickPos = pos

        const hit = getNearestSymbol(page, pos)

        if (hit) {
            if (doubleClick) {
                const cluster = getCluster(page, hit.paraIx)!
                this.updateHighlights(getClusterRects(page, cluster))
                this.selection = null
                this.dragSelection = null

                this.rootTarget = {
                    x: (cluster.aabb.min[0] + cluster.aabb.max[0]) * 0.5,
                    y: (cluster.aabb.min[1] + cluster.aabb.max[1]) * 0.5,
                    width: (cluster.aabb.max[0] - cluster.aabb.min[0]) * 0.5,
                    height: (cluster.aabb.max[1] - cluster.aabb.min[1]) * 0.5,
                    visible: true,
                }

                this.setState({
                    hint: null,
                    hintId: (this.state.hintId + 1) % 4096,
                    translation: cluster.translation,
                })
            } else {
                const hint = getHint(page.paragraphs[hit.paraIx]!, hit.symIx)!

                if (hint) {
                    this.selection = {
                        paraIx: hit.paraIx,
                        symBegin: hint.begin,
                        symEnd: hint.end,
                    }
                    this.updateHighlights(getSelectionRects(page, this.selection))
                    this.rootTarget = getSelectionTarget(page, this.selection)
                    this.setState({
                        hint: hint ? immutable(hint) : null,
                        hintId: (this.state.hintId + 1) % 4096,
                        translation: "",
                    })
                } else {
                    this.selection = {
                        paraIx: hit.paraIx,
                        symBegin: hit.symIx,
                        symEnd: hit.symIx + 1,
                    }
                    this.updateHighlights(getSelectionRects(page, this.selection))
                    this.rootTarget = getSelectionTarget(page, this.selection)
                    this.setState({
                        hint: null,
                        hintId: (this.state.hintId + 1) % 4096,
                        translation: "???",
                    })
                }
            }

            this.updateRoot()
            return true
        } else {
            if (this.selection !== null || this.state.translation !== null) {
                this.selection = null
                this.setState({
                    hint: null,
                    translation: null,
                })
                this.rootTarget.visible = false
                this.updateHighlights([])
                this.updateRoot()
                return true
            }
        }

        return false
    }

    dragStart(pos: Point): boolean {
        const { page } = this.state
        if (!page) return false

        let time = new Date().getTime()
        let doubleClick = (time - this.clickTime < 200)
        this.prevClickPos = pos
        if (doubleClick) return false

        if (this.selection) {
            const hit = getNearestSymbol(page, pos)
            if (hit && hit.paraIx == this.selection.paraIx
                    && hit.symIx >= this.selection.symBegin
                    && hit.symIx < this.selection.symEnd) {
                if (this.selection.symEnd - this.selection.symBegin <= 3) {
                    this.dragSelectionBegin = hit.symIx == this.selection.symBegin
                    this.dragSelectionEnd = hit.symIx == this.selection.symEnd - 1
                } else {
                    this.dragSelectionBegin = hit.symIx <= this.selection.symBegin + 1
                    this.dragSelectionEnd = hit.symIx >= this.selection.symEnd - 2
                }
                if (this.dragSelectionBegin || this.dragSelectionEnd) {
                    this.dragSelection = this.selection
                }
                this.dragTapSymbolIx = hit.symIx
                return true
            }
        }

        return false
    }

    dragMove(pos: Point) {
        const { page } = this.state
        if (!page) return
        if (!this.dragSelection) return

        const hit = getNearestSymbol(page, pos)
        if (!hit) {
            this.dragTapSymbolIx = -1
        }

        if (hit && hit.paraIx == this.dragSelection.paraIx) {
            const prevSelection = this.selection
            if (this.dragSelectionBegin && this.dragSelectionEnd) {
                this.selection = {
                    paraIx: this.dragSelection.paraIx,
                    symBegin: Math.min(hit.symIx, this.dragSelection.symBegin),
                    symEnd: Math.max(hit.symIx + 1, this.dragSelection.symEnd),
                }
            } else if (this.dragSelectionBegin) {
                this.selection = {
                    paraIx: this.dragSelection.paraIx,
                    symBegin: Math.min(hit.symIx, this.dragSelection.symEnd - 1),
                    symEnd: this.dragSelection.symEnd,
                }
            } else if (this.dragSelectionEnd) {
                this.selection = {
                    paraIx: this.dragSelection.paraIx,
                    symBegin: this.dragSelection.symBegin,
                    symEnd: Math.max(hit.symIx + 1, this.dragSelection.symBegin + 1),
                }
            }

            if (this.selection && (!prevSelection || (this.selection.symBegin != prevSelection.symBegin || this.selection.symEnd != prevSelection.symEnd))) {
                this.dragTapSymbolIx = -1
                const hint = getAltHint(page.paragraphs[hit.paraIx]!, this.selection.symBegin, this.selection.symEnd)

                if (hint != this.state.hint) {
                    this.setState({
                        hint: hint ? immutable(hint as any) : null,
                        hintId: (this.state.hintId + 1) % 4096,
                        translation: "",
                    })
                }

                this.rootTarget = getSelectionTarget(page, this.selection)
                this.updateHighlights(getSelectionRects(page, this.selection))
                this.updateRoot()
            }
        } else {
            this.selection = this.dragSelection
        }
    }

    dragEnd() {
        const { page } = this.state

        if (page && this.selection && this.dragTapSymbolIx >= 0) {
            const symIx = this.dragTapSymbolIx
            this.dragTapSymbolIx = -1

            this.selection = {
                paraIx: this.selection.paraIx,
                symBegin: symIx,
                symEnd: symIx + 1,
            }

            const hint = getAltHint(page.paragraphs[this.selection.paraIx]!, symIx, symIx + 1)
            if (hint != this.state.hint) {
                this.setState({
                    hint: hint ? immutable(hint as any) : null,
                    hintId: (this.state.hintId + 1) % 4096,
                    translation: "",
                })
            }

            this.rootTarget = getSelectionTarget(page, this.selection)
            this.updateHighlights(getSelectionRects(page, this.selection))
            this.updateRoot()
        }

        if (this.dragSelection != null) {
            this.clickTime = new Date().getTime()
        }
        this.dragSelection = null
    }

    updateViewport(viewport: Viewport) {
        this.viewport = viewport
        this.updateRoot()
    }

    clearOverlay() {
        this.selection = null
        this.clickTime = 0
        this.dragSelection = null
        this.dragSelectionBegin = false
        this.dragSelectionEnd = false
        this.dragTapSymbolIx = -1
        this.rootTarget.visible = false
        this.setState({
            page: null,
            hint: null,
            hintId: -1,
            translation: null,
        })
        this.updateHighlights([])
        this.updateRoot()
    }

    updateRoot() {
        const { viewport, rootTarget } = this
        const viewSize = { x: window.innerWidth, y: window.innerHeight }

        const topState = globalState.user?.overlay?.rootRef.current
        if (!topState) return

        if (this.rootVisible !== rootTarget.visible) {
            topState.style.display = rootTarget.visible ? "block" : "none"
            this.rootVisible = rootTarget.visible
        }

        if (!this.rootVisible) return

        const isPhone = viewSize.x < 500
        const borderPadding = isPhone ? 5 : 10

        const fullWidth = viewSize.x - 2 * borderPadding
        const minWidth = Math.min(350, fullWidth)
        const maxWidth = 450

        const minHeight = Math.min(300, viewSize.y * 0.8 - 2 * borderPadding)
        const maxHeight = 500

        const elemSize = {
            x: isPhone ? fullWidth : Math.min(Math.max(viewSize.x * 0.45, minWidth), maxWidth),
            y: Math.min(Math.max(viewSize.y * 0.3, minHeight), maxHeight),
        }

        const minPos = {
            x: borderPadding,
            y: borderPadding,
        }
        const maxPos = {
            x: viewSize.x - elemSize.x - borderPadding,
            y: viewSize.y - elemSize.y - borderPadding,
        }

        const target = {
            x: rootTarget.x * viewport.scale + viewport.x,
            y: rootTarget.y * viewport.scale + viewport.y,
            width: rootTarget.width * viewport.scale,
            height: rootTarget.height * viewport.scale,
            visible: rootTarget.visible,
        }

        if (elemSize.x >= viewSize.x * 0.90) {
            this.rootVertical = true
        } else if (elemSize.x <= viewSize.x * 0.87) {
            this.rootVertical = false
        }

        if (isPhone) {
            this.rootVertical = true
        }

        let targetPos
        if (this.rootVertical) {
            if (!this.rootOnTop && target.y > minPos.y + elemSize.y * 0.82) {
                this.rootOnTop = true
            } else if (this.rootOnTop && target.y < minPos.y + elemSize.y * 0.8) {
                this.rootOnTop = false
            }

            if (this.rootOnTop) {
                targetPos = {
                    x: target.x - elemSize.x * 0.5,
                    y: target.y - target.height - elemSize.y * 1.05,
                }
            } else {
                targetPos = {
                    x: target.x - elemSize.x * 0.5,
                    y: target.y + target.height + elemSize.y * 0.05,
                }
            }
        } else {
            if (!this.rootOnLeft && target.x > minPos.x + viewSize.x * 0.52) {
                this.rootOnLeft = true
            } else if (this.rootOnLeft && target.x < minPos.x + viewSize.x * 0.48) {
                this.rootOnLeft = false
            }

            if (this.rootOnLeft) {
                targetPos = {
                    x: target.x - elemSize.x * 1.05 - target.width,
                    y: target.y - elemSize.y * 0.5,
                }
            } else {
                targetPos = {
                    x: target.x + target.width + elemSize.x * 0.05,
                    y: target.y - elemSize.y * 0.5,
                }
            }
        }

        const pos = targetPos

        if (targetPos.x < minPos.x) targetPos.x = minPos.x
        if (targetPos.y < minPos.y) targetPos.y = minPos.y
        if (targetPos.x > maxPos.x) targetPos.x = maxPos.x
        if (targetPos.y > maxPos.y) targetPos.y = maxPos.y

        const deltaX = (this.rootPos.x - pos.x) / viewSize.x
        const deltaY = (this.rootPos.y - pos.y) / viewSize.y
        const minDelta = 0.00000001

        const sizeDeltaX = (this.rootSize.x - elemSize.x) / viewSize.x
        const sizeDeltaY = (this.rootSize.y - elemSize.y) / viewSize.y
        const minSizeDelta = 0.001

        if (sizeDeltaX*sizeDeltaX + sizeDeltaY*sizeDeltaY > minSizeDelta*minSizeDelta) {
            this.rootSize.x = elemSize.x
            this.rootSize.y = elemSize.y

            topState.style.width = `${elemSize.x}px`
            topState.style.height = `${elemSize.y}px`
        }

        if (deltaX*deltaX + deltaY*deltaY > minDelta*minDelta) {
            this.rootPos.x = pos.x
            this.rootPos.y = pos.y
            topState.style.transform = `translate(${pos.x}px, ${pos.y}px)`
        }
    }
}
