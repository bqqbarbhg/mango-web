import { useEffect, useRef } from "kaiku"

type ClassName = string | ClassName[] | Record<string, boolean>

export default function Icon(props: {
    svg: string
    className?: ClassName
}) {
    const ref = useRef<HTMLElement>()

    useEffect(() => {
        if (ref.current) {
            ref.current.innerHTML = props.svg
        }
    })

    const className = props.className
        ? ["icon", props.className] : "icon"
    return <div className={className} ref={ref} />
}
