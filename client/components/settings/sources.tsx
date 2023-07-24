import { useEffect, useState } from "kaiku";
import { globalState, pushError } from "../../state";
import { apiCall } from "../../utils/api";

async function fetchSources() {
    if (globalState.user) {
        try {
            const sources = await apiCall("GET /sources", {})
            globalState.user.sources = sources.sources
        } catch (err) {
            pushError("Failed to fetch sources", err, { deduplicate: true })
        }
    }
}

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

    useEffect(() => { fetchSources() })

    const state = useState({
        url: "",
    })

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
