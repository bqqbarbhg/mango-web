import { globalState } from "../../state"
import { Hint } from "./hint"
import { Translation } from "./translation"

export function Overlay() {
    const state = globalState.user?.overlay
    if (!state) return null

    return <div className="overlay-root" ref={state.rootRef}>
        <div className="overlay-top">
            {/* @ts-ignore */}
            {state.hint ? <Hint hint={state.hint} key={state.hintId.toString()} /> : null}
            {state.translation != "" ? <Translation text={state.translation} /> : null}
        </div>
    </div>
}
