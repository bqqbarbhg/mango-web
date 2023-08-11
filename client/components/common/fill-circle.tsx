
type Props = {
    amount: number
}
export function FillCircle(props: Props) {
    const { amount } = props

    const x = 50.0 + Math.sin(amount * 2*Math.PI) * 50.0
    const y = 50.0 - Math.cos(amount * 2*Math.PI) * 50.0
    const large = amount >= 0.5 ? 1 : 0

    const stroke = 25

    return <svg viewBox={`${-stroke} ${-stroke} ${100+stroke*2} ${100+stroke*2}`}>
        <circle
            cx="50" cy="50" r="50"
            stroke="black" stroke-width={stroke}
            fill="none" />
        <path
            d={`M 50 10 A 50 50 0 ${large} 1 ${x} ${y}`}
            stroke="white" stroke-width={stroke}
            fill="none" />
    </svg>
}
