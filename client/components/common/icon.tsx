import { useEffect, useRef } from "kaiku"

export default function Icon(props: {
    svg: string
    className?: string
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

