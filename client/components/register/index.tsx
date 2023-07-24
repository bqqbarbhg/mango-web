import { useState } from "kaiku"
import { apiCall } from "../../utils/api"
import { navigateTo, pushError } from "../../state"

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
            console.log(err)
            pushError("Failed to register", err, { deduplicate: true })
        } finally {
            state.pending = false
        }
    }

    return <form onSubmit={register}>
        <div>
            <input
                type="text"
                id="register-username"
                name="username"
                value={() => state.username}
                onInput={(e: any) => state.username = e.target.value}
                disabled={state.pending}
                required
            />
            <label for="register-username">Username</label>
        </div>
        <div>
            <input
                type="email"
                id="register-email"
                name="email"
                value={() => state.email}
                onInput={(e: any) => state.email = e.target.value}
                disabled={state.pending}
                required
            />
            <label for="register-email">Email</label>
        </div>
        <div>
            <input
                type="password"
                id="login-password"
                name="password"
                value={() => state.password}
                onInput={(e: any) => {
                    state.password = e.target.value;
                    validatePasswordCheck()
                }}
                disabled={state.pending}
                required
            />
            <label for="login-password">Password</label>
        </div>
        <div>
            <input
                type="password"
                id="register-password-check"
                name="password-check"
                value={() => state.passwordCheck}
                onInput={(e: any) => {
                    state.passwordCheck = e.target.value
                    validatePasswordCheck()
                }}
                disabled={state.pending}
                ref={state.passwordCheckRef}
                required
            />
            <label for="register-password-check">Password (check)</label>
        </div>
        <div>
            <input
                type="submit"
                value="Register"
                disabled={state.pending}
            />
        </div>
        <div>
            <a href="/">Login</a>
        </div>
    </form>
}

export function Index() {
    return <div>
        <RegisterForm />
    </div>
}
