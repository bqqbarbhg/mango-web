import { useEffect, useState } from "kaiku"
import { Modal, ModalOption, globalState } from "../../state"
import Icon from "./icon"

function ModalOption({ option }: { option: ModalOption }) {
    const onClick = (e: MouseEvent) => {
        const modal = globalState.modal
        if (!modal) return

        e.preventDefault()
        e.stopPropagation()

        modal.resolve(option.key)
        globalState.modal = null
    }

    return <div className="modal-option" onClick={onClick}>
        {option.icon ? <Icon svg={option.icon} /> : null}
        {option.text}
    </div>
}

function ModalContent({ modal }: { modal: Modal }) {
    const style: Record<string, string> = { }

    const state = useState({
        opening: false,
        opened: false,
    })

    useEffect(() => {
        if (!state.opening) {
            state.opening = true
            setTimeout(() => {
                state.opened = true
            }, 40)
        }
    })

    const open = state.opened

    const rect = modal.targetRect
    const position = modal.targetPosition
    if (rect && position !== "auto") {
        let translateX = "0"
        let translateY = "0"
        let transformOrigin = ""

        const pad = 4
        if (position.startsWith("top")) {
            style.top = `${rect.y - pad}px`
            translateY = "-100%"
            transformOrigin = "bottom"
        } else {
            style.top = `${rect.y + rect.height + pad}px`
            transformOrigin = "top"
        }
        if (position.endsWith("left")) {
            style.left = `${rect.x - pad}px`
            translateX = "-100%"
            transformOrigin += " right"
        } else {
            style.left = `${rect.x + rect.width + pad}px`
            transformOrigin += " left"
        }

        if (open) {
            style.transform = `translate(${translateX}, ${translateY})`
            style.opacity = "1"
        } else {
            style.transform = `translate(${translateX}, ${translateY}) scale(0.25)`
            style.opacity = "0"
        }
        style.transformOrigin = transformOrigin
    }


    return <div className="modal" style={style}>
        {modal.options.map(option => <ModalOption option={option} />)}
    </div>
}

export function Modal() {
    const modal = globalState.modal

    const onBackgroundClick = (e: MouseEvent) => {
        if (!modal) return
        if (modal.allowCancel) {
            e.preventDefault()
            e.stopPropagation()
            modal.resolve("cancel")
            globalState.modal = null
        }
    }

    const rect = modal?.targetRect
    const rectPad = 4
    return <div
        className={{
            "modal-parent": true,
            "modal-open": !!modal,
        }}
        onClick={onBackgroundClick}
    >
        {rect ?
            <div className="modal-highlight" style={{
                left: `${rect.x - rectPad}px`,
                top: `${rect.y - rectPad}px`,
                width: `${rect.width + rectPad*2}px`,
                height: `${rect.height + rectPad*2}px`,
            }}/> : null}
        {modal ? <ModalContent modal={modal} /> : null}
    </div>
}

