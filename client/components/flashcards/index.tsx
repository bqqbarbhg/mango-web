import { useEffect, useState } from "kaiku";
import { RouteFlashcards, globalState } from "../../state";
import { refreshFlashcards } from "../../utils/fetching";
import { FlashcardList } from "./flashcard-list";
import { FlashcardTest } from "./flashcard-test";

export function Index({ route }: { route: RouteFlashcards }) {
    const state = useState({
        loaded: false,
    })

    useEffect(() => {
        if (!state.loaded) {
            state.loaded = true
            refreshFlashcards()
        }
    })

    return <FlashcardTest />
}
