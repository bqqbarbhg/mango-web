import { useEffect, useState } from "kaiku";
import { RouteFlashcards, globalState } from "../../state";
import { refreshFlashcards } from "../../utils/fetching";
import { FlashcardList } from "./flashcard-list";
import { FlashcardTest } from "./flashcard-test";
import { useFade } from "../../utils/fade";

export function Index({ route }: { route: RouteFlashcards }) {
    const state = useState({
        loaded: false,
        showList: false,
    })

    const listFade = useFade(state.showList)

    useEffect(() => {
        if (!state.loaded) {
            state.loaded = true
            refreshFlashcards()
        }
    })

    const onShowList = () => {
        state.showList = true
    }

    const onCloseList = () => {
        state.showList = false
    }

    return <>
        {/*@ts-ignore*/}
        {listFade.cull ? null :
            <FlashcardList
                hide={listFade.hide}
                onClose={onCloseList}
            />
        }
        {/*@ts-ignore*/}
        <FlashcardTest onShowList={onShowList}/>
    </>
}
