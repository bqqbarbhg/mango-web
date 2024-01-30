import { RouteSettings, clearUser, globalState, pushError } from "../../state"
import { Link } from "../common/link"
import { Sessions } from "./sessions"
import { Sources } from "./sources"
import * as css from "./settings.module.css"
import { apiCall } from "../../utils/api"
import Icon from "../common/icon"
import IconAdjustmentsHorizontal from "@tabler/icons/adjustments-horizontal.svg"
import IconServer from "@tabler/icons/server.svg"
import IconDevices from "@tabler/icons/devices.svg"
import IconKey from "@tabler/icons/key.svg"
import IconLogout from "@tabler/icons/logout.svg"
import IconUser from "@tabler/icons/user.svg"
import IconChevronLeft from "@tabler/icons/chevron-left.svg"
import IconChevronRight from "@tabler/icons/chevron-right.svg"
import { useEffect, useState } from "kaiku"
import { Account } from "./account"
import { PreferencesTab } from "./preferences"

const tabTitles: Record<string, string> = {
    preferences: "Preferences",
    sources: "Sources",
    sessions: "Sessions",
    account: "Account",
}

export function SettingsTab({ tab }: { tab: string | null }) {
    if (tab === "sessions") {
        return <Sessions />
    } else if (tab === "sources") {
        return <Sources />
    } else if (tab === "account") {
        return <Account />
    } else if (tab === "preferences") {
        return <PreferencesTab />
    } else {
        return null
    }
}

export function SettingsButton({ tab, icon }: {
    tab: string
    icon: string
}) {
    const title = tabTitles[tab]!
    return <Link
        className={() => ({
            [css.settingsButton]: true,
            [css.settingsButtonSelected]: (globalState.route as RouteSettings).tab === tab,
        })}
        href={`/settings/${tab}`}
    >
        <Icon className={css.settingsButtonIcon} svg={icon} /> {title}
        {globalState.mobile ?
            <Icon className={css.settingsButtonArrowRight} svg={IconChevronRight} />
            : null}
    </Link>
}

export function Index({ route }: { route: RouteSettings }) {
    async function logout() {
        try {
            await apiCall("POST /auth/logout", {})
            clearUser()
        } catch (err) {
            pushError("Failed to log out", err, { deduplicate: true })
        }
    }

    type State = {
        latchTab: string | null
    }

    const state = useState<State>({
        latchTab: null,
    })

    if (globalState.mobile && route.tab) {
        state.latchTab = route.tab
    } else if (!globalState.mobile) {
        state.latchTab = null
    }

    const tab = route.tab ?? state.latchTab
    return <div className={{
        [css.settingsTop]: true,
        [css.hide]: globalState.mobile && route.tab,
    }}>
        <div className={css.flexLeft} />
        <div className={css.settingsNav}>
            <div className={css.settingsUser}>
                <Icon svg={IconUser}/>
                {globalState.user?.name}
            </div>
            <SettingsButton tab="preferences" icon={IconAdjustmentsHorizontal} />
            <SettingsButton tab="sources" icon={IconServer} />
            <SettingsButton tab="sessions" icon={IconDevices} />
            <SettingsButton tab="account" icon={IconKey} />
            <div className={css.settingsNavSpace} />
            <button className={[css.settingsButton, css.logoutButton]} onClick={logout}>
                <Icon className={css.settingsButtonIcon} svg={IconLogout} />
                Sign out
            </button>
        </div>
        <div className={css.settingsMain}>
            {globalState.mobile ? 
                <div className={css.settingsBackParent}>
                    <Link className={css.settingsBackLink} href="/settings">
                        <Icon className={css.settingsButtonArrowLeft} svg={IconChevronLeft} />
                        <div>Settings</div>
                    </Link>
                    <div className={css.settingsBackLabel}>
                        {tab ? tabTitles[tab]! : null}
                    </div>
                    <div className={css.settingsBackCenterer} />
                </div>
            : null}
            <div className={css.settingsScroll}>
                <div className={css.settingsContent}>
                    <SettingsTab tab={tab} />
                </div>
            </div>
        </div>
    </div>
}
