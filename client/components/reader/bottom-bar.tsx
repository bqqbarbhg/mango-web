import { useEffect, useRef, useState } from "kaiku"
import { Link } from "../common/link"
import { useFade } from "../../utils/fade"
import { globalState } from "../../state"
import { readerInstance } from "./reader"
import Icon from "../common/icon"
import IconArrowLeft from "@tabler/icons/arrow-left.svg"
import IconArrowRight from "@tabler/icons/arrow-right.svg"
import IconBooks from "@tabler/icons/books.svg"
import IconList from "@tabler/icons/list.svg"

function ChapterListButton({ state }: { state: BottomBarState }) {
    const onClick = () => {
        state.showChapters = !state.showChapters
    }

    return <div className="bottom-bar-button-parent chapter-list-button">
        {/* @ts-ignore */}
        <button className="bottom-bar-button" onClick={onClick}>
            <Icon svg={IconList} />
            <div className="bottom-bar-button-label">Chapters</div>
        </button>
    </div>
}

function PageButton({ direction, disabled }: {
    direction: number,
    disabled: boolean,
}) {
    const onClick = () => {
        if (disabled) return
        if (direction < 0) {
            readerInstance?.moveToPreviousPage()
        } else {
            readerInstance?.moveToNextPage()
        }
    }

    let icon = ""
    switch (direction) {
        // case -2: icon = IconArrowBarToLeft; break;
        case -1: icon = IconArrowLeft; break;
        case  1: icon = IconArrowRight; break;
        // case  2: icon = IconArrowBarToRight; break;
    }

    return <button onClick={onClick} className="bottom-bar-button" disabled={disabled}>
        <Icon svg={icon} />
    </button>
}

function BottomBarContent({ state }: { state: BottomBarState }) {
    const currentVolume = globalState.user?.currentVolume
    if (!currentVolume) return null

    const onClickHome = (e: MouseEvent) => {
        readerInstance?.requestQuit()

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
        <PageButton direction={-1} disabled={state.showChapters} />
        <div className="bottom-bar-page">
            {currentVolume.currentPage + 1} / {currentVolume.content.pages.length}
        </div>
        <PageButton direction={1} disabled={state.showChapters} />
        <div className="bottom-bar-space" />
        <ChapterListButton state={state} />
        <div className="bottom-bar-edge" />
    </div>
}

export type BottomBarState = {
    showChapters: boolean
}
type ContainerProps = {
    visible: boolean
    state: BottomBarState
}
export function BottomBar(props: ContainerProps) {
    const fade = useFade(props.visible, { cullDelayMs: 200 })

    return <div className={() => ({
        "bottom-bar": true,
        "hide": fade.hide,
        "cull": fade.cull,
    })}>
        {fade.cull ? null : <BottomBarContent state={props.state} /> }
    </div>
}
