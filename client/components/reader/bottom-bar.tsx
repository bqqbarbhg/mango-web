import { useState } from "kaiku"
import { Link } from "../common/link"
import { useFade } from "../../utils/fade"
import { ChapterList } from "./chapter-list"
import { globalState } from "../../state"

function ChapterListButton() {
    const state = useState({
        visible: false,
    })

    const onClick = () => {
        state.visible = !state.visible
    }

    return <div className="chapter-list-button">
        <ChapterList visible={state.visible} />
        <button onClick={onClick}>Chapters</button>
    </div>
}

function BottomBarContent() {
    const currentVolume = globalState.user?.currentVolume
    if (!currentVolume) return null

    return <div className="bottom-bar-content">
        <Link href="/">Home</Link>
        <ChapterListButton />
        <div>
            {currentVolume.currentPage + 1}/{currentVolume.content.pages.length}
        </div>
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
