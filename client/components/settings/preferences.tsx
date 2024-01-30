import { Form, FormHeading, FormInputSelect, FormInputSubmit, FormInputText } from "./forms";
import * as css from "./account.module.css"
import { MangoError, Preferences, globalState, pushError } from "../../state";
import { apiCall } from "../../utils/api";
import { immutable, useEffect, useState } from "kaiku";
import { deepEqual, deepUnwrap } from "../../utils/deep";

export function PreferencesTab() {
    const user = globalState.user
    if (!user) return null

    type State = {
        prev?: Preferences
        next?: Preferences
    }

    const state = useState<State>({})

    useEffect(() => {
        if (!state.next) {
            state.next = deepUnwrap(user.preferences)
            state.prev = immutable(deepUnwrap(state.next))
        }
    })

    useEffect(() => {
        if (state.next && !deepEqual(state.prev, state.next)) {
            const copy = immutable(deepUnwrap(state.next))
            user.preferences = copy
            state.prev = copy

            localStorage.setItem("user", JSON.stringify({
                name: user.name,
                token: user.token,
                preferences: copy,
            }))

            apiCall("POST /preferences", { preferences: copy })
                .catch((err) => {
                    pushError("Failed to update preferences", err, {
                        deduplicate: true,
                    })
                })
        }
    })

    const prefs = state.next
    if (!prefs) return null

    return <div>
        <Form onSubmit={() => {}}>
            <FormHeading>Visuals</FormHeading>
            <FormInputSelect
                data={prefs}
                prop="animations"
                label="Animations"
                options={[
                    { key: "default", label: "Use device setting" },
                    { key: "on", label: "Always on" },
                    { key: "off", label: "Always off" },
                ]}
            />

        </Form>
    </div>
}

