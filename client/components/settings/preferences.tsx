import { Form, FormHeading, FormInputSelect, FormInputSubmit, FormInputText } from "./forms";
import * as css from "./account.module.css"
import { MangoError, Preferences, globalState, pushError } from "../../state";
import { apiCall } from "../../utils/api";
import { immutable, useEffect, useShallowState, useState } from "kaiku";
import { clone, deepEqual } from "../../utils/deep";

export function PreferencesTab() {
    const user = globalState.user
    if (!user) return null

    type State = {
        prev?: Preferences
        next?: Preferences
    }

    const state = useShallowState<State>({})

    useEffect(() => {
        if (!state.next) {
            state.next = user.preferences
            state.prev = state.next
        }
    })

    useEffect(() => {
        if (state.next && !deepEqual(state.prev, state.next)) {
            const copy = clone(state.next)
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

