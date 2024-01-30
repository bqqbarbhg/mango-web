import * as PJ from "../../reader/page-json"
import { FC, useRef, useState } from "kaiku"
import { apiCall } from "../../utils/api"
import { InlineJapanese } from "../common/inline-japanese"
import { globalState, pushError, showModal } from "../../state"
import IconRefresh from "@tabler/icons/refresh.svg"
import IconTrash from "@tabler/icons/trash.svg"
import IconPlus from "@tabler/icons/plus.svg"
import { refreshFlashcards } from "../../utils/fetching"
import Icon from "../common/icon"
import { HighlightPulse, showHighlight } from "../../utils/visuals"

function Radical({ radical }: { radical: PJ.Radical }) {
    return <div className="radical" >
        <img className="radical-image" src={radical.image} />
        <div className="radical-text">{radical.name}</div>
    </div>
}

function RadicalList({ radicals }: { radicals: PJ.Radical[] }) {
    return <div className="radical-list">
        {radicals.map(r => <Radical radical={r} />)}
    </div>
}

type HintSelectionState = {
    selectedIndex: number
    extraExpand: boolean
}

type ResultContentProps = {
    result: PJ.Result
    expand: boolean
    extraExpand: boolean
    conjugation?: boolean
    maxGloss?: number
}

export function ResultContent(props: ResultContentProps) {
    const { result, expand, extraExpand } = props
    const numGloss = result.gloss.length

    let glossPart = []
    let maxGloss = 3
    if (expand) {
        if (extraExpand) {
            maxGloss = 1000
        } else {
            maxGloss = 6
            if (numGloss > maxGloss) {
                maxGloss = maxGloss - 1
            }
        }
    }
    if (props.maxGloss && !(expand && extraExpand)) {
        maxGloss = props.maxGloss
    }

    for (const gloss of result.gloss) {
        if (glossPart.length >= maxGloss) {
            const missing = numGloss - glossPart.length
            if (expand && !extraExpand) {
                glossPart.push(<li className="gloss-more"><span>(tap for {missing} more)</span></li>)
            }
            break
        }
        glossPart.push(<li><span>{gloss}</span></li>)
    }

    let kanjiText = ""
    let kanaText = ""

    let wkPart = []

    if (expand) {
        for (const kanji of result.kanji) {
            if (kanjiText) kanjiText += ", "
            kanjiText += kanji.text
        }

        for (const kana of result.kana) {
            if (kanaText) kanaText += ", "
            kanaText += kana.text
        }

        const wkLists = [
            result.wk_meaning_mnemonic,
            result.wk_meaning_hint,
            result.wk_reading_mnemonic,
            result.wk_reading_hint,
        ]

        for (const list of wkLists) {
            if (!list) continue

            wkPart.push(<div className="wk-container">
                {list.map(({ type, text }) => <span className={["wk-span", `wk-tag-${type}`]}>
                    <InlineJapanese text={text} />
                </span>)}
            </div>)
        }
    }

    const conjText = (props.conjugation ?? true) ? result.conjugation : null

    return <>
        {result.radicals ? <RadicalList radicals={result.radicals} /> : null}
        <ul className="hint-gloss">{glossPart}</ul>
        {conjText ? <div className="hint-conjugation">{conjText}</div> : null}
        {(kanjiText || kanaText) ? <div className="hint-text-container">
            {kanjiText ? <div className="hint-write-read">
                <span className="hint-label">Writing </span>
                <span lang="ja-jp" className="hint-text">{kanjiText}</span>
            </div> : null}
            {kanaText ? <div className="hint-write-read">
                <span className="hint-label">Reading </span>
                <span lang="ja-jp" className="hint-text">{kanaText}</span>
            </div> : null}
        </div> : null}
        {wkPart}
    </>
}

type ResultProps = {
    hintSelectionState: HintSelectionState
    result: PJ.Result
    index: number
}

const Result: FC<ResultProps> = ({ hintSelectionState, result, index }: ResultProps) => {
    const user = globalState.user
    if (!user) return null

    const addRef = useRef<HTMLElement>()

    const expand = hintSelectionState.selectedIndex === index
    const extraExpand = hintSelectionState.extraExpand

    let titleText = ""

    if (result.kanji.length > 0) {
        titleText += result.kanji[0]!.text
    }

    if (result.kana.length > 0) {
        if (titleText != "") {
            titleText += "【" + result.kana[0]!.text + "】"
        } else {
            titleText += result.kana[0]!.text;
        }
    }

    const flashcardWord = titleText
    const level = user.flashcardLevel.get(flashcardWord) ?? null

    const onAddClick = async (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const target = addRef.current as HTMLElement
        const example = result.query

        try {
            if (level !== null) {
                const modalResult = await showModal({
                    options: [
                        { key: "update", text: "Update definition", icon: IconRefresh },
                        { key: "remove", text: "Remove", icon: IconTrash },
                    ],
                    targetElement: target,
                    targetPosition: "bottom-left",
                    allowCancel: true
                })

                if (modalResult === "remove") {
                    const existing = user.flashcards.find(f => f.word === flashcardWord)
                    if (existing) {
                        await apiCall("DELETE /flashcards/:uuid", {
                            uuid: existing.uuid,
                        })
                    }
                } else if (modalResult === "update") {
                    await apiCall("POST /flashcards", {
                        word: flashcardWord,
                        example,
                        data: result,
                    })
                } else if (modalResult === "cancel") {
                    return
                }

            } else {
                await apiCall("POST /flashcards", {
                    word: flashcardWord,
                    example,
                    data: result,
                })
            }
        } catch (err) {
            pushError("Failed to add flashcard", err, { deduplicate: true })
        }

        showHighlight(target, {
            ...HighlightPulse,
            color: "#080",
        })
        refreshFlashcards()
    }

    return <div
        className={{
            "hint-container": true,
            "hint-selected": expand,
        }}
        onClick={(e: MouseEvent) => {
            e.preventDefault()
            if (hintSelectionState.selectedIndex === index) {
                hintSelectionState.extraExpand = !hintSelectionState.extraExpand
            } else {
                hintSelectionState.selectedIndex = index
                hintSelectionState.extraExpand = false
            }
            window.queueMicrotask(() => {
                const element = document.querySelector(".hint-selected")
                if (element) {
                    element.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",   
                    })
                }
            })
        }}
    >
        <div className="hint-title-parent">
            <div lang="ja-jp" className="hint-title">{titleText}</div>
            <div className="hint-title-space" />
            <button
                className={{
                    "hint-add": true,
                    "hint-add-active": level !== null,
                }}
                onClick={onAddClick}
                ref={addRef}
            >
                {level === null ? <Icon svg={IconPlus}/> : level}
            </button>
        </div>
        <div className="hint-content">
            <ResultContent
                result={result}
                expand={expand}
                extraExpand={extraExpand} />
        </div>                
    </div>
}

type HintProps = {
    hint: PJ.Hint,
}
export const Hint: FC<HintProps> = ({ hint }: HintProps) => {
    const hintSelectionState = useState({
        selectedIndex: -1,
        extraExpand: false,
    })
    return <div className="overlay-top-scroll">
        <div className="hint-top">
            {hint.results.map((r, ix) =>
                <Result
                    hintSelectionState={hintSelectionState}
                    result={r}
                    index={ix}
                    key={ix.toString()} />)}
        </div>
    </div>
}
