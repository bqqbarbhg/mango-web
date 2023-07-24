import { Child } from "kaiku"
import { Link } from "./link"
import { clearUser, globalState, pushError } from "../../state"
import { apiCall } from "../../utils/api"

type Props = {
    children: Child|Child[]
}
export function AppFrame(props: Props) {
    async function logout() {
        try {
            await apiCall("POST /auth/logout", {})
            clearUser()
        } catch (err) {
            pushError("Failed to log out", err, { deduplicate: true })
        }
    }

    return <>
        <nav>
            <Link href="/">List</Link>
            <Link href="/settings">Settings</Link>
            <button onClick={logout}>Log out</button>
        </nav>
        <main>
            {props.children}
        </main>
    </>
}
