import { RouteSettings, globalState } from "../../state"
import { Sessions } from "./sessions"

export function SettingsTab() {
    const route = globalState.route as RouteSettings
    if (route.tab === "sessions") {
        return <Sessions key="sessions" />
    } else {
        return null
    }
}

export function Index() {
    return <div>
        <h1>Settings</h1>
        <div>
            <SettingsTab />
        </div>
    </div>
}
