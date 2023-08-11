import { useState } from "kaiku"
import { apiCall } from "../../utils/api"
import { clearErrors, globalState, pushError } from "../../state"

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

    return <form onSubmit={login}>
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
                onInput={(e: any) => state.password = e.target.value}
                disabled={state.pending}
                required
            />
            <label for="login-password">Password</label>
        </div>
        <div>
            <input
                type="submit"
                value="Login"
                disabled={state.pending}
            />
        </div>
        <div>
            <a href="/register">Register</a>
        </div>
    </form>
}

export function Index() {
    return <div>
        <LoginForm />
    </div>
}
