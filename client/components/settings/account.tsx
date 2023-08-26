import { useState } from "kaiku";
import { Form, FormHeading, FormInputSubmit, FormInputText } from "./forms";
import * as css from "./account.module.css"
import { MangoError, pushError } from "../../state";
import { apiCall } from "../../utils/api";

function PasswordForm() {
    const state = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    })

    const onSubmit = async (e: SubmitEvent) => {
        e.preventDefault()

        try {
            if (state.newPassword !== state.confirmPassword) {
                throw new MangoError("user", "Password confirm does not match")
            }

            await apiCall("POST /auth/password", {
                oldPassword: state.oldPassword,
                newPassword: state.newPassword,
            })

            state.oldPassword = ""
            state.newPassword = ""
            state.confirmPassword = ""
        } catch (err) {
            pushError("Failed to update password", err, {
                deduplicate: true,
            })
        }
    }

    return <Form className={css.passwordForm} onSubmit={onSubmit}>
        <FormInputText data={state} prop="oldPassword" label="Old password" type="password" />
        <FormInputText data={state} prop="newPassword" label="New password" type="password" />
        <FormInputText data={state} prop="confirmPassword" label="New password (confirm)" type="password" />
        <FormInputSubmit  label="Change password" />
    </Form>
}

export function Account() {
    return <div>
        <div>
            <FormHeading>Change password</FormHeading>
            <PasswordForm />
        </div>
    </div>
}
