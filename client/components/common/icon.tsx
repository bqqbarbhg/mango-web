import { useEffect, useRef } from "kaiku"

export default function Icon({ svg }: { svg: string }) {
    const ref = useRef<HTMLElement>()

    useEffect(() => {
        if (ref.current) {
            ref.current.innerHTML = svg
        }
    })

    return <div ref={ref} />
}

