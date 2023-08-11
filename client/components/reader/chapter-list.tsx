import { MangoChapter, globalState } from "../../state"
import { useFade } from "../../utils/fade"
import { FillCircle } from "../common/fill-circle"

function Chapter({ chapter }: { chapter: MangoChapter }) {

    const onClick = () => {
        const volume = globalState.user?.currentVolume
        if (!volume) return
        volume.currentPage = chapter.startPage
    }

    return <div
        className="chapter-list-chapter"
        onClick={onClick}
    >
        <div className="chapter-list-fill">
            <FillCircle amount={0.2} />
        </div>
        <div>
            <div>{chapter.title.en}</div>
            <div>{chapter.title.jp ?? ""}</div>
        </div>
    </div>
}

type Props = { visible: boolean }
export function ChapterList(props: Props) {
    const fade = useFade(props.visible)

    const volume = globalState.user?.currentVolume
    if (!volume) return

    return <div className={{
        "chapter-list": true,
        "hide": fade.hide,
        "cull": fade.cull,
    }}>
        {fade.cull ? null : volume.info.chapters.map(c => <Chapter chapter={c} />)}
    </div>
}
