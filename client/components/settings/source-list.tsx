import { useState } from "kaiku";
import { globalState } from "../../state";
import { apiCall } from "../../utils/api";

async function fetchSources() {
    if (globalState.user) {
        const sources = await apiCall("GET /sources", {})
        globalState.user.sources = sources.sources
    }
}

export function SourceList() {
    const user = globalState.user
    if (!user) return null

    async function addSource(url: string) {
        try {
            await apiCall("POST /sources", { url })
            await fetchSources()
        } catch (err) {
            console.error(err)
        }
    }

    async function deleteSource(uuid: string) {
        try {
            await apiCall("DELETE /sources/:uuid", { uuid })
            await fetchSources()
        } catch (err) {
            console.error(err)
        }
    }

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
