import { useEffect, useState } from "kaiku";
import { SourceAuth, globalState, pushError } from "../../state";
import { apiCall } from "../../utils/api";
import { fetchSources } from "../../utils/fetching";
import * as css from "./sources.module.css"

function SourceForm() {
    type State = {
        url: string
        auth: SourceAuth
    }

    const state = useState<State>({
        url: "",
        auth: { type: "none" }
    })

    async function addSource() {
        try {
            const { url, auth } = state
            await apiCall("POST /sources", { url, auth })
            await fetchSources()
        } catch (err) {
            pushError("Failed to add source", err, { deduplicate: true })
        }
    }

    function sourceSubmit(e: any) {
        e.preventDefault()
        addSource()
        state.url = ""
        state.auth = { type: "none" }
    }

    const auth = state.auth
    return  <form onSubmit={sourceSubmit}>
        <div className={css.sourceForm}>
            <div className={css.sourceInputParent}>
                <div className={css.sourceInput}>
                    <input className={css.input} id="source-url" value={() => state.url} onInput={(e: any) => state.url = e.target.value} />
                </div>
                <label className={css.sourceInputLabel} for="source-url">URL</label>
            </div>
            <div className={css.sourceInputParent}>
                <div className={css.sourceInput}>
                    <select className={css.input} id="source-auth" onInput={(e: any) => {
                        const type = e.target.value
                        if (type !== state.auth.type) {
                            if (type === "none") {
                                state.auth = {
                                    type: "none",
                                }
                            } else if (type === "basic") {
                                state.auth = {
                                    type: "basic",
                                    username: "",
                                    password: "",
                                }
                            }
                        }
                    }}>
                        <option value="none" selected={auth.type === "none"}>None</option>
                        <option value="basic" selected={auth.type === "basic"}>Basic</option>
                    </select>
                </div>
                <label className={css.sourceInputLabel} for="source-auth">Authentication</label>
            </div>
            {auth.type !== "none" ?
                <div className={css.authParent}>
                    {auth.type === "basic" ?
                        <>
                            <div className={css.sourceInputParent}>
                                <div className={css.sourceInput}>
                                    <input id="source-auth-username" className={css.input} value={() => auth.username} onInput={(e: any) => auth.username = e.target.value} />
                                </div>
                                <label className={css.sourceInputLabel} for="source-auth-username">Username</label>
                            </div>
                            <div className={css.sourceInputParent}>
                                <div className={css.sourceInput}>
                                    <input id="source-auth-password" className={css.input} value={() => auth.password} onInput={(e: any) => auth.password = e.target.value} />
                                </div>
                                <label className={css.sourceInputLabel} for="source-auth-password">Password</label>
                            </div>
                        </>
                    : null}
                </div>
            : null}
        </div>
        <input className={css.submit} type="submit" value="Add source" />
    </form>
}

export function Sources() {
    const user = globalState.user
    if (!user) return null

    async function deleteSource(uuid: string) {
        try {
            await apiCall("DELETE /sources/:uuid", { uuid })
            await fetchSources()
        } catch (err) {
            pushError("Failed to delete source", err, { deduplicate: true })
        }
    }


    const state = useState({
        loaded: false,
    })

    if (!state.loaded) {
        fetchSources()
        state.loaded = true
    }

    return <div>
        <ul>
            {user.sources.map(source => <li>
                <span>{source.url}</span>
                <button onClick={() => deleteSource(source.uuid)}>Delete</button>
            </li>)}
        </ul>
        <div>
            <SourceForm />
        </div>
    </div>

}
