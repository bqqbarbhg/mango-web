import { Child } from "kaiku"
import { Link } from "./link"
import { clearUser, globalState, pushError } from "../../state"
import { apiCall } from "../../utils/api"

type Props = {
    children: Child|Child[]
}
export function AppFrame(props: Props) {
    const user = globalState.user
    if (!user) return null

    async function logout() {
        try {
            await apiCall("POST /auth/logout", {})
            clearUser()
        } catch (err) {
            pushError("Failed to log out", err, { deduplicate: true })
        }
    }

    return <div className="app-root">
        <nav>
            <Link href="/">List</Link>
            <Link href="/settings">Settings</Link>
            <span>{user.name}</span>
            <button onClick={logout}>Log out</button>
        </nav>
        <main className="app-main">
            {props.children}
        </main>
    </div>
}
