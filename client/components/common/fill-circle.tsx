
type Props = {
    amount: number
    max?: number
}
export function FillCircle(props: Props) {
    const max = props.max ?? 1
    const amount = props.amount / max

    const x = 50.0 + Math.sin(amount * 2*Math.PI) * 50.0
    const y = 50.0 - Math.cos(amount * 2*Math.PI) * 50.0
    const large = amount >= 0.5 ? 1 : 0

    const stroke = 25

    return <svg viewBox={`${-stroke} ${-stroke} ${100+stroke*2} ${100+stroke*2}`}>
        <title>
            {props.max ? `${props.amount}/${props.max}` : `${props.amount*100}`}
        </title>
        <circle
            cx="50" cy="50" r="50"
            stroke="black" stroke-width={stroke}
            fill="none" />
        {amount <= 0.001 ?  null : <path
            d={`M 50 0 A 50 50 0 ${large} 1 ${x} ${y}`}
            stroke="white" stroke-width={stroke}
            fill="none" />}
    </svg>
}
