import { Child } from "kaiku"
import { navigateTo } from "../../state"

type Props = {
    href: string
    children: Child|Child[]
}
export function Link(props: Props) {
    function navigate(e: any) {
        try {
            navigateTo(props.href)
            e.preventDefault()
        } catch (err) {
        }
    }

    return <a href={props.href} onClick={navigate}>
        {props.children}
    </a>
}
