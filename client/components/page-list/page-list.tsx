import { useRef, useState } from "kaiku";
import { globalState } from "../../state";
import * as css from "./page-list.module.css"
import { readerInstance } from "../reader/reader";

function Page({ index }: {
    index: number
}) {
    const volume = globalState.user?.currentVolume
    if (!volume) return null

    const state = useState({
        clicked: false,
    })

    const onClick = () => {
        if (state.clicked) return
        state.clicked = true
        volume.currentPage = index
        setTimeout(() => {
            readerInstance?.hideChapterList()
        }, 150)
    }

    const atlas = volume.content.atlas
    const pageContent = volume.content.pages[index]!

    const ratio = 1

    const pageBase = Math.floor(index / 32);
    const pageBit = 1 << index % 32;
    const isRead = ((volume.readPages[pageBase] ?? 0) & pageBit) != 0

    const width = pageContent.atlasW*ratio
    const height = pageContent.atlasH*ratio

    return <div
        onClick={onClick}
        className={{
            [css.pageParent]: true,
        }}
        style={{
            width, height,
            margin: "4px",
        }}>
        <div
            className={() => ({
                [css.pageContent]: true,
                [css.read]: isRead,
                [css.clicked]: state.clicked,
            })}
            style={{
                width, height,
                backgroundImage: `url(${volume.source.url}/${volume.path}/atlas.png)`,
                backgroundPosition: `-${pageContent.atlasX*ratio}px -${pageContent.atlasY*ratio}px`,
                backgroundSize: `${atlas.width*ratio}px ${atlas.height*ratio}px`,
            }}>
        </div>
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
    return <div className={css.pageList}>
        {pages}
    </div>
}
