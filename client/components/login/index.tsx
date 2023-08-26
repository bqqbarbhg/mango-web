import { useState } from "kaiku"
import { apiCall } from "../../utils/api"
import { clearErrors, globalState, pushError } from "../../state"
import { Form, FormHeading, FormInputSubmit, FormInputText } from "../settings/forms"
import { Link } from "../common/link"

function LoginForm() {
    const state = useState({
        username: "",
        password: "",
        pending: false,
    })

    async function login(e: any) {
        e.preventDefault()
        try {
            state.pending = true
            const user = await apiCall("POST /auth/login", {
                username: state.username,
                password: state.password,
                device: navigator.userAgent,
            })

            globalState.user = {
                name: state.username,
                token: user.token,
                sources: [],
                volumes: [],
                currentVolume: null,
                overlay: null,
                flashcards: [],
                flashcardLevel: new Map(),
            }

            localStorage.setItem("user", JSON.stringify({
                name: state.username,
                token: user.token,
            }))
            clearErrors()
        } catch (err) {
            pushError("Failed to login", err, { deduplicate: true })
        } finally {
            state.pending = false
        }
    }

    return <Form onSubmit={login} className="auth-form">
        <FormHeading>Login</FormHeading>
        <FormInputText
            data={state}
            prop="username"
            label="Username"
            disabled={state.pending}
            required={true}
        />
        <FormInputText
            data={state}
            prop="password"
            type="password"
            label="Password"
            disabled={state.pending}
            required={true}
        />
        <FormInputSubmit
            label="Log in"
            disabled={state.pending}
        />
        <div className="auth-link">
            <Link href="/register">Register</Link>
        </div>
    </Form>
}

export function Index() {
    return <div className="auth-form-parent">
        <LoginForm />
    </div>
}
