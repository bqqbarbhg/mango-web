import { useState } from "kaiku"
import { apiCall } from "../../utils/api"

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
            const user = apiCall("POST /auth/login", {
                username: state.username,
                password: state.password,
                device: navigator.userAgent,
            })
        } catch (err) {
            console.error(err)
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
