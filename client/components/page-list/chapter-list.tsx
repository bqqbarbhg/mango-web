import { FC, useEffect, useRef, useState } from "kaiku"
import { globalState } from "../../state"
import { PageList } from "./page-list"
import * as css from "./chapter-list.module.css"
import { useFade } from "../../utils/fade"
import { FillCircle } from "../common/fill-circle"
import { useSourceBlobUrl } from "../../utils/blob-cache"

type ChapterProps = {
    atlasUrl: string
    chapterIndex: number
}

export const Chapter: FC<ChapterProps> = ({ atlasUrl, chapterIndex }: ChapterProps) => {
    const state = useState({
        expand: false,
        pageHeight: 0.0,
    })

    const pageListRef = useRef<HTMLElement>()
    const openFade = useFade(state.expand)

    useEffect(() => {
        const ref = pageListRef.current
        if (ref) {
            state.pageHeight = ref.offsetHeight
            const observer = new ResizeObserver(() => {
                state.pageHeight = ref.offsetHeight
            })
            observer.observe(ref)
            return () => {
                observer.unobserve(ref)
            }
        }
    })

    const volume = globalState.user?.currentVolume
    if (!volume) return null

    const chapter = volume.info.chapters[chapterIndex]!
    const firstPage = chapter.startPage
    const lastPage = chapterIndex + 1 < volume.info.chapters.length
        ? volume.info.chapters[chapterIndex + 1]!.startPage - 1
        : volume.content.pages.length

    const pageCount = (lastPage - firstPage) + 1

    let readCount = 0
    for (let page = firstPage; page <= lastPage; page++) {
        const zeroPage = page - 1
        const pageBase = Math.floor(zeroPage / 32)
        const pageBit = 1 << (zeroPage % 32)
        const readBits = volume.readPages[pageBase] ?? 0
        readCount += (pageBit & readBits) !== 0 ? 1 : 0
    }

    const onClick = () => {
        state.expand = !state.expand
    }

    const number = chapter.index
    return <div className={css.chapter}>
        <div onClick={onClick} className={css.chapterHead}>
            <div>
                <div className={[css.title, css.titleEn]}>{number}. {chapter.title.en}</div>
                <div className={[css.title, css.titleJp]}>{chapter.title.jp ?? ""}</div>
            </div>
            <div className={css.chapterPad} />
            <div className="chapter-list-fill">
                <FillCircle amount={readCount} max={pageCount} />
            </div>
        </div>
        <div
            className={{
                [css.chapterPages]: true,
                hide: openFade.hide,
            }}
            style={{
                height: () => openFade.hide ? "0" : `${state.pageHeight}px`,
            }}
        >
            <div className={css.pageContainer} ref={pageListRef}>
                {!openFade.cull
                    ? <PageList atlasUrl={atlasUrl} pageStart={firstPage} pageCount={pageCount} />
                    : null}
            </div>
        </div>
    </div>
}

export function ChapterList() {
    const volume = globalState.user?.currentVolume
    if (!volume) return null

    const atlasPath = `${volume.path}/atlas.png`
    const atlasUrl = useSourceBlobUrl(volume.source, atlasPath)

    const chapters = []
    for (let i = 0; i < volume.info.chapters.length; i++) {
        chapters.push(<Chapter atlasUrl={atlasUrl} chapterIndex={i} key={i.toString()} />)
    }

    return <div className={css.top}>
        {chapters}
    </div>
}
