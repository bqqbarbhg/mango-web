import { useEffect, useState } from "kaiku";
import { apiCall } from "../../utils/api";
import { pushError } from "../../state";

type Session = {
    uuid: string,
    device: string,
}

function Session(props: { session: Session, reload: () => any }) {

    async function logout() {
        try {
            await apiCall("DELETE /auth/sessions/:uuid", {
                uuid: props.session.uuid,
            })
        } catch (err) {
            pushError("Failed to log out", err)
        }
        props.reload()
    }

    return <div>
        <div>{props.session.uuid}</div>
        <div>{props.session.device}</div>
        <button onClick={logout}>Log out</button>
    </div>
}

export function Sessions() {
    type State = {
        sessions: Session[]
        loaded: boolean
    }
    const state = useState<State>({
        sessions: [],
        loaded: false,
    })

    async function reloadSessions() {
        try {
            const sessions = await apiCall("GET /auth/sessions", { })
            state.sessions = sessions.sessions
        } catch (err) {
            pushError("Failed to load sessions", err)
        }
    }

    if (!state.loaded) {
        reloadSessions()
        state.loaded = true
    }

    async function logoutAll() {
        try {
            await apiCall("DELETE /auth/sessions", { })
            reloadSessions()
        } catch (err) {
            pushError("Failed to log out all", err)
        }
    }

    return <div>
        <button onClick={logoutAll}>Log out all</button>
        <div>
            {state.sessions.map(s => <Session session={s} reload={reloadSessions} />)}
        </div>
    </div>
}
