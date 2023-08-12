import { globalState } from "../../state"
import { Hint } from "./hint"
import { Translation } from "./translation"

const onTouchStart = (e: TouchEvent) => {
    // This is enough to claim the touch for the element in iOS..
}

export function Overlay() {
    const state = globalState.user?.overlay
    if (!state) return null

    return <div className="overlay-root" ref={state.rootRef} onTouchStart={onTouchStart}>
        <div className="overlay-top">
            {/* @ts-ignore */}
            {state.hint ? <Hint hint={state.hint} key={state.hintId.toString()} /> : null}
            {state.translation !== null ? <Translation text={state.translation} /> : null}
        </div>
    </div>
}
