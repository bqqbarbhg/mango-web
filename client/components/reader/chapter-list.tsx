import { MangoChapter, globalState } from "../../state"
import { useFade } from "../../utils/fade"
import { FillCircle } from "../common/fill-circle"

function Chapter({ chapter, chapterIndex }: {
    chapter: MangoChapter,
    chapterIndex: number,
}) {
    const volume = globalState.user?.currentVolume
    if (!volume) return null

    const onClick = () => {
        const volume = globalState.user?.currentVolume
        if (!volume) return
        volume.currentPage = chapter.startPage
    }

    const firstPage = chapter.startPage
    const lastPage = chapterIndex + 1 < volume.info.chapters.length
        ? volume.info.chapters[chapterIndex + 1]!.startPage - 1
        : volume.content.pages.length

    const totalCount = (lastPage - firstPage) + 1
    let readCount = 0
    for (let page = firstPage; page <= lastPage; page++) {
        const zeroPage = page - 1
        const pageBase = Math.floor(zeroPage / 32)
        const pageBit = 1 << (zeroPage % 32)
        const readBits = volume.readPages[pageBase] ?? 0
        readCount += (pageBit & readBits) !== 0 ? 1 : 0
    }

    return <div
        className="chapter-list-chapter"
        onClick={onClick}
    >
        <div className="chapter-list-fill">
            <FillCircle amount={readCount} max={totalCount} />
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
        {fade.cull ? null : volume.info.chapters.map((c, ix) =>
            <Chapter chapter={c} chapterIndex={ix} />)}
    </div>
}
