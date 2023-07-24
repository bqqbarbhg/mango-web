import { useState } from "kaiku"
import { apiCall } from "../../utils/api"
import { pushError } from "../../state"

function RegisterForm() {
    type State = {
        username: string
        password: string
        passwordCheck: string
        passwordCheckRef: { current?: HTMLInputElement }
        pending: boolean
    }

    const state = useState<State>({
        username: "",
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
            const user = await apiCall("POST /auth/register", {
                username: state.username,
                password: state.password,
            })

            // window.location.href = "/"
        } catch (err) {
            console.log(err)
            pushError("Failed to register", err)
        } finally {
            state.pending = false
        }
    }

    return <form onSubmit={register}>
        <div>
            <input
                type="text"
                id="login-username"
                name="username"
                value={() => state.username}
                onInput={(e: any) => state.username = e.target.value}
                disabled={state.pending}
                required
            />
            <label for="login-username">Username</label>
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
                id="login-password-check"
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
            <label for="login-password-check">Password (check)</label>
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
