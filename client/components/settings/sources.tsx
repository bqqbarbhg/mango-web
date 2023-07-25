import { useEffect, useState } from "kaiku";
import { globalState, pushError } from "../../state";
import { apiCall } from "../../utils/api";
import { fetchSources } from "../../utils/fetching";

export function Sources() {
    const user = globalState.user
    if (!user) return null

    async function addSource(url: string) {
        try {
            await apiCall("POST /sources", { url })
            await fetchSources()
        } catch (err) {
            pushError("Failed to add source", err, { deduplicate: true })
        }
    }

    async function deleteSource(uuid: string) {
        try {
            await apiCall("DELETE /sources/:uuid", { uuid })
            await fetchSources()
        } catch (err) {
            pushError("Failed to delete source", err, { deduplicate: true })
        }
    }


    const state = useState({
        url: "",
        loaded: false,
    })

    if (!state.loaded) {
        fetchSources()
        state.loaded = true
    }

    function sourceSubmit(e: any) {
        e.preventDefault()
        addSource(state.url)
        state.url = ""
    }

    return <div>
        <ul>
            {user.sources.map(source => <li>
                <span>{source.url}</span>
                <button onClick={() => deleteSource(source.uuid)}>Delete</button>
            </li>)}
        </ul>
        <div>
            <form onSubmit={sourceSubmit}>
                <input value={() => state.url} onInput={(e: any) => state.url = e.target.value} />
                <input type="submit" value="Add source" />
            </form>
        </div>
    </div>

}
