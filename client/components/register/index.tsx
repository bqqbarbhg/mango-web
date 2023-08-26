import { useState } from "kaiku"
import { apiCall } from "../../utils/api"
import { navigateTo, pushError } from "../../state"
import { Form, FormHeading, FormInputSubmit, FormInputText } from "../settings/forms"
import { Link } from "../common/link"

function RegisterForm() {
    type State = {
        username: string
        email: string
        password: string
        passwordCheck: string
        passwordCheckRef: { current?: HTMLInputElement }
        pending: boolean
    }

    const state = useState<State>({
        username: "",
        email: "",
        password: "",
        passwordCheck: "",
        passwordCheckRef: { },
        pending: false,
    })

    function validatePasswordCheck() {
        const passwordCheck = state.passwordCheckRef.current
        if (!passwordCheck) return
        const match = state.password === state.passwordCheck
        passwordCheck.setCustomValidity(match ? "" : "Password does not match")
    }

    async function register(e: any) {
        e.preventDefault()

        try {
            state.pending = true
            await apiCall("POST /auth/register", {
                username: state.username,
                email: state.email,
                password: state.password,
            })

            navigateTo("/")
        } catch (err) {
            pushError("Failed to register", err, { deduplicate: true })
        } finally {
            state.pending = false
        }
    }

    return <Form onSubmit={register} className="auth-form">
        <FormHeading>Register</FormHeading>
        <FormInputText
            data={state}
            prop="username"
            label="Username"
            disabled={state.pending}
            required={true}
        />
        <FormInputText
            data={state}
            prop="email"
            type="email"
            label="Email"
            disabled={state.pending}
            required={true}
        />
        <FormInputText
            data={state}
            prop="password"
            type="password"
            label="Password"
            onInput={(e: any) => {
                state.password = e.target.value
                validatePasswordCheck()
            }}
            disabled={state.pending}
            required={true}
        />
        <FormInputText
            data={state}
            prop="passwordCheck"
            type="password"
            label="Password check"
            ref={state.passwordCheckRef}
            onInput={(e: any) => {
                state.passwordCheck = e.target.value
                validatePasswordCheck()
            }}
            disabled={state.pending}
            required={true}
        />
        <FormInputSubmit
            label="Register"
            disabled={state.pending}
        />
        <div className="auth-link">
            <Link href="/">Log in</Link>
        </div>
    </Form>
}

export function Index() {
    return <div className="auth-form-parent">
        <RegisterForm />
    </div>
}
