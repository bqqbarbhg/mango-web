import { Child } from "kaiku"
import { navigateTo } from "../../state"

type Props = {
    href: string
    children: Child|Child[]
    className?: any
    onClick?: (e: MouseEvent) => boolean | Promise<boolean>
}
export function Link(props: Props) {

    function navigate(e: MouseEvent) {
        if (props.onClick?.(e)) return

        try {
            navigateTo(props.href)
            e.preventDefault()
        } catch (err) {
        }
    }

    return <a href={props.href} onClick={navigate} className={props.className}>
        {props.children}
    </a>
}
