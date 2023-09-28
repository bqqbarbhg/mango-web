import { useEffect, useState } from "kaiku";
import { Source, SourceAuth, globalState, pushError, showModal } from "../../state";
import { apiCall } from "../../utils/api";
import { fetchSources } from "../../utils/fetching";
import * as css from "./sources.module.css"
import { Form, FormGroup, FormHeading, FormInputSelect, FormInputSubmit, FormInputText, FormList, FormListEntry, FormMenuButton } from "./forms";
import IconTrash from "@tabler/icons/trash.svg"
import { findModalTarget } from "../common/modal";

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

    const onAuthType = (e: InputEvent) => {
        const type = (e.target as HTMLInputElement).value
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
    }

    const auth = state.auth
    return  <Form onSubmit={sourceSubmit}>
        <FormGroup title="Source" />
        <FormInputText data={state} type="url" prop="url" label="URL" required />

        <FormGroup title="Authentication" />
        <FormInputSelect
            data={auth}
            prop="type"
            id="auth-type"
            label="Method"
            onInput={onAuthType}
            options={[
                { key: "none", label: "None" },
                { key: "basic", label: "Basic" },
            ]}
        />
        {auth.type === "basic" ?
            <>
                <FormInputText data={auth} id="auth-basic-username" prop="username" label="Username" required />
                <FormInputText data={auth} id="auth-basic-password" prop="password" type="password" label="Password" required />
            </>
        : null}

        <FormInputSubmit label="Add source" />
    </Form>
}

export function SourceEntry({ source, onOptions }: {
    source: Source
    onOptions: (e: MouseEvent) => void,
}) {
    return <FormListEntry className={css.sourceEntry}>
        <div className={css.sourceName}>
            {source.url}
        </div>
        <FormMenuButton onClick={onOptions} />
    </FormListEntry>
}

export function SourceList() {
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

    const onOptions = async (e: MouseEvent, uuid: string) => {
        const value = await showModal({
            options: [
                { key: "delete", text: "Delete", icon: IconTrash },
            ],
            targetPosition: "bottom-left",
            targetElement: findModalTarget(e.target, "button"),
            allowCancel: true,
        })

        if (value === "delete") {
            deleteSource(uuid)
        }
    }

    const state = useState({
        loaded: false,
    })

    if (!state.loaded) {
        fetchSources()
        state.loaded = true
    }

    return <FormList>
        {user.sources.map(source =>
            <SourceEntry
                source={source}
                onOptions={(e) => onOptions(e, source.uuid)}
            />)}
    </FormList>
}

export function Sources() {
    return <div>
        <div>
            <FormHeading>Sources</FormHeading>
            <SourceList />
        </div>
        <div>
            <FormHeading>Add</FormHeading>
            <SourceForm />
        </div>
    </div>

}
