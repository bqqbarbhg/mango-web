import { useEffect, useState } from "kaiku"
import { Source, globalState, pushError } from "../../state"
import { apiCall } from "../../utils/api"
import { Volume } from "./volume"
import { refreshVolumes } from "../../utils/fetching"
import * as css from "./listing.module.css"

export function Index() {
    const user = globalState.user
    if (!user) return null

    const state = useState({
        pending: false,
        loaded: false,
    })

    async function update() {
        if (state.pending) return
        state.pending = true
        await refreshVolumes()
        state.pending = false
    }

    if (!state.loaded) {
        update()
        state.loaded = true
    }

    return <div className={css.top} >
        <button
            onClick={update}
            disabled={state.pending}
        >
            Refresh
        </button>
        <div>
            {user.volumes.map(volume => <div key={volume.volume.path}><Volume volume={volume} key={volume.volume.path} /></div>)}
        </div>
    </div>
}

