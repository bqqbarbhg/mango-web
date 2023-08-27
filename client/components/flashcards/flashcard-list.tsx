import { Flashcard, globalState } from "../../state";
import { apiCall } from "../../utils/api";
import { refreshFlashcards } from "../../utils/fetching";
import Icon from "../common/icon";
import IconX from "@tabler/icons/x.svg"
import * as css from "./flashcard-list.module.css"

function FlashcardEntry({ flashcard }: {
    flashcard: Flashcard
}) {

    const onDelete = async () => {
        await apiCall("DELETE /flashcards/:uuid", {
            uuid: flashcard.uuid
        })
        refreshFlashcards()
    }

    return <div>
        <div lang="ja-jp">{flashcard.word}</div>
        <button onClick={onDelete}>
            Delete
        </button>
    </div>
}

export function FlashcardList({ hide, onClose }: {
    hide: boolean
    onClose: () => void
}) {
    const flashcards = globalState.user?.flashcards ?? []
    return <div className={{
        "flashcard-list-top": true,
        "hide": hide,
    }}>
        <div className={css.navTop}>
            <div className={css.navSpacer} />
            <button className={css.closeButton} onClick={onClose}>
                <Icon svg={IconX} />
            </button>
        </div>

        {flashcards.map(v => <FlashcardEntry flashcard={v} />)}
    </div>
}

