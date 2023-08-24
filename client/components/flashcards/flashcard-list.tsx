import { Flashcard, globalState } from "../../state";
import { apiCall } from "../../utils/api";
import { refreshFlashcards } from "../../utils/fetching";

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

export function FlashcardList() {
    const flashcards = globalState.user?.flashcards ?? []
    return <div>
        {flashcards.map(v => <FlashcardEntry flashcard={v} />)}
    </div>
}

