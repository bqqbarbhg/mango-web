import { Volume } from "../../state"
import { Link } from "../common/link"

type Props = {
    volume: Volume
}
export function Volume(props: Props) {
    const { volume } = props
    const { path, info } = volume.volume

    const url = `${volume.sourceUrl}/${path}`

    return <div>
        <Link href={`/read/${path}?source=${volume.sourceUuid}`}><img src={`${url}/cover.jpg`} /></Link>
        <h3>{info.title.en}</h3>
        {info.title.jp ? <h4>{info.title.jp}</h4> : null}
        {info.volume !== null ? <h4>{info.volume}</h4> : null}
    </div>
}
