import { useState } from "kaiku";
import { globalState } from "../../state";
import * as css from "./page-list.module.css"

function Page({ index }: {
    index: number
}) {
    const volume = globalState.user?.currentVolume
    if (!volume) return null

    const atlas = volume.content.atlas
    const pageContent = volume.content.pages[index]!

    const ratio = 1

    return <div style={{
        backgroundImage: `url(${volume.source.url}/${volume.path}/atlas.png)`,
        backgroundPosition: `-${pageContent.atlasX*ratio}px -${pageContent.atlasY*ratio}px`,
        backgroundSize: `${atlas.width*ratio}px ${atlas.height*ratio}px`,
        width: pageContent.atlasW*ratio,
        height: pageContent.atlasH*ratio,
        margin: "4px",
    }}>
    </div>
}

export function PageList({ pageStart, pageCount }: {
    pageStart: number,
    pageCount: number,
}) {
    const volume = globalState.user?.currentVolume
    if (!volume) return null

    const pages = []
    for (let i = 0; i < pageCount; i++) {
        pages.push(<Page index={pageStart + i} />)
    }
    return <div className="page-list">
        {pages}
    </div>
}

export function Chapter({ chapterIndex }: {
    chapterIndex: number,
}) {
    const state = useState({
        expand: false,
    })

    const volume = globalState.user?.currentVolume
    if (!volume) return null

    const chapter = volume.info.chapters[chapterIndex]!
    const firstPage = chapter.startPage
    const lastPage = chapterIndex + 1 < volume.info.chapters.length
        ? volume.info.chapters[chapterIndex + 1]!.startPage - 1
        : volume.content.pages.length

    const pageCount = lastPage - firstPage - 1

    const onClick = () => {
        state.expand = !state.expand
    }

    return <div>
        <div onClick={onClick} className={css.chapterHead}>
            <div>{chapter.title.en}</div>
            <div>{chapter.title.jp ?? ""}</div>
        </div>
        {state.expand
            ? <PageList pageStart={firstPage} pageCount={pageCount} />
            : null}
    </div>
}

export function ChapterList() {
    const volume = globalState.user?.currentVolume
    if (!volume) return null

    const chapters = []
    for (let i = 0; i < volume.info.chapters.length; i++) {
        chapters.push(<Chapter chapterIndex={i} />)
    }

    return <div style={{
        height: "100%",
        overflow: "auto",
    }}>
        {chapters}
    </div>
}


