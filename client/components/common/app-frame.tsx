import { Child } from "kaiku"
import { Link } from "./link"
import { clearUser, globalState, pushError } from "../../state"
import { apiCall } from "../../utils/api"
import Icon from "./icon"
import IconBooks from "@tabler/icons/books.svg"
import IconCards from "@tabler/icons/cards.svg"
import IconSettings from "@tabler/icons/settings.svg"

function NavButton({ href, mobile, icon, name, selected }: {
    href: string
    mobile: boolean
    icon: string
    name: string
    selected: boolean
}) {
    return <Link
        className={{
            "nav-button": true,
            "nav-button-selected": selected,
            "nav-button-mobile": mobile,
        }}
        href={href}
    >
        <Icon svg={icon} />
        <div className="nav-label">{name}</div>
    </Link>
}

function AppNav({ mobile }: { mobile: boolean }) {
    const { user, route } = globalState
    if (!user) return null

    return <nav className={{
            "main-nav": true,
            "main-nav-mobile": mobile,
        }}
    >
        <NavButton
            mobile={mobile}
            href="/"
            name="Home"
            icon={IconBooks}
            selected={route.path === "/"}
        />
        <NavButton
            mobile={mobile}
            href="/flashcards"
            name="Flashcards"
            icon={IconCards}
            selected={route.path === "/flashcards/"}
        />
        <NavButton
            mobile={mobile}
            href="/settings"
            name="Settings"
            icon={IconSettings}
            selected={route.path === "/settings/"}
        />
    </nav>
}

type Props = {
    children: Child|Child[]
}

export function AppFrame(props: Props) {
    const mobile = globalState.mobile

    return <div className="app-root">
        {!mobile ? <AppNav mobile={false} /> : null}
        <main className="app-main">
            {props.children}
        </main>
        {mobile ? <AppNav mobile={true} /> : null}
    </div>
}
