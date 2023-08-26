import { useEffect, useState } from "kaiku";
import { apiCall } from "../../utils/api";
import { pushError, showModal } from "../../state";
import { FormButton, FormHeading, FormList, FormListEntry, FormMenuButton } from "./forms";
import * as css from "./sessions.module.css"
import { findModalTarget } from "../common/modal";
import IconLogout from "@tabler/icons/logout.svg"

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

    const onOptions = async (e: MouseEvent) => {
        const value = await showModal({
            options: [
                { key: "logout", text: "Log out", icon: IconLogout },
            ],
            targetPosition: "bottom-left",
            targetElement: findModalTarget(e.target, "button"),
            allowCancel: true,
        })

        if (value === "logout") {
            logout()
        }
    }

    return <FormListEntry className={css.sessionEntry}>
        <div>{props.session.device}</div>
        <FormMenuButton onClick={onOptions} />
    </FormListEntry>
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
        <FormHeading>Sessions</FormHeading>
        <FormList>
            {state.sessions.map(s => <Session session={s} reload={reloadSessions} />)}
        </FormList>
        <FormButton onClick={logoutAll}>Log out all</FormButton>
    </div>
}
