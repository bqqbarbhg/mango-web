import { useEffect, useState } from "kaiku";

type FadeState = {
    hide: boolean
    cull: boolean
}

export function useFade(show: boolean, init?: { cullDelayMs?: number }): FadeState {
    const state = useState({
        requestShow: show,
        hide: !show,
        cull: !show,
        showTimeout: -1,
        cullTimeout: -1,
    })
    state.requestShow = show

    useEffect(() => {
        if (state.requestShow) {
            state.cull = false
            if (state.hide && state.showTimeout < 0) {
                state.showTimeout = window.setTimeout(() => {
                    state.showTimeout = -1
                    state.hide = false
                }, 1)
            }
            if (state.cullTimeout >= 0) {
                window.clearTimeout(state.cullTimeout)
                state.cullTimeout = -1
            }
        } else {
            state.hide = true
            if (state.showTimeout >= 0) {
                window.clearTimeout(state.showTimeout)
                state.showTimeout = -1
            }
            if (!state.cull && state.cullTimeout < 0) {
                state.cullTimeout = window.setTimeout(() => {
                    state.cullTimeout = -1
                    state.cull = true
                }, init?.cullDelayMs ?? 1000)
            }
        }
    })

    return state as FadeState
}
