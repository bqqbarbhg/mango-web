import { useEffect, useRef, useState } from "kaiku"
import { Link } from "../common/link"
import { useFade } from "../../utils/fade"
import { ChapterList } from "./chapter-list"
import { globalState } from "../../state"
import { readerInstance } from "./reader"
import Icon from "../common/icon"
import IconArrowLeft from "@tabler/icons/arrow-left.svg"
import IconArrowRight from "@tabler/icons/arrow-right.svg"
import IconArrowBarToLeft from "@tabler/icons/arrow-bar-to-left.svg"
import IconArrowBarToRight from "@tabler/icons/arrow-bar-to-right.svg"
import IconBooks from "@tabler/icons/books.svg"
import IconList from "@tabler/icons/list.svg"

function ChapterListButton() {
    const state = useState({
        visible: false,
    })

    const onClick = () => {
        state.visible = !state.visible
    }

    return <div className="bottom-bar-button-parent chapter-list-button">
        {/* @ts-ignore */}
        <ChapterList visible={state.visible} />
        <button className="bottom-bar-button" onClick={onClick}>
            <Icon svg={IconList} />
            <div className="bottom-bar-button-label">Chapters</div>
        </button>
    </div>
}

function PageButton({ direction }: {
    direction: number,
}) {
    const onClick = () => {
        if (direction < 0) {
            readerInstance?.moveToPreviousPage()
        } else {
            readerInstance?.moveToNextPage()
        }
    }

    let icon = ""
    switch (direction) {
        case -2: icon = IconArrowBarToLeft; break;
        case -1: icon = IconArrowLeft; break;
        case  1: icon = IconArrowRight; break;
        case  2: icon = IconArrowBarToRight; break;
    }

    // TODO:
    // Redesign with https://tabler-icons.io/
    // Use both text and icon if not on mobile!

    /*
    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-arrow-bar-to-right" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
        <path d="M14 12l-10 0"></path>
        <path d="M14 12l-4 4"></path>
        <path d="M14 12l-4 -4"></path>
        <path d="M20 4l0 16"></path>
    </svg>
*/

    return <button onClick={onClick} className="bottom-bar-button">
        <Icon svg={icon} />
    </button>
}

function BottomBarContent() {
    const currentVolume = globalState.user?.currentVolume
    if (!currentVolume) return null

    const onClickHome = (e: MouseEvent) => {
        globalState.transitionRoute = { path: "/" }
        globalState.requestTransitionFromVolume = currentVolume.path

        e.preventDefault()
        return true
    }

    return <div className="bottom-bar-content">
        <div className="bottom-bar-edge" />
        <div className="bottom-bar-button-parent">
            <Link href="/" className="bottom-bar-button" onClick={onClickHome}>
                <Icon svg={IconBooks} />
                <div className="bottom-bar-button-label">
                    Home
                </div>
            </Link>
        </div>
        <div className="bottom-bar-space" />
        <PageButton direction={-2} />
        <PageButton direction={-1} />
        <div className="bottom-bar-page">
            {currentVolume.currentPage + 1} / {currentVolume.content.pages.length}
        </div>
        <PageButton direction={1} />
        <PageButton direction={2} />
        <div className="bottom-bar-space" />
        <ChapterListButton />
        <div className="bottom-bar-edge" />
    </div>
}

type ContainerProps = {
    visible: boolean
}
export function BottomBar(props: ContainerProps) {
    const fade = useFade(props.visible, { cullDelayMs: 200 })

    return <div className={() => ({
        "bottom-bar": true,
        "hide": fade.hide,
        "cull": fade.cull,
    })}>
        {fade.cull ? null : <BottomBarContent /> }
    </div>
}
