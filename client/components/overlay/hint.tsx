import * as PJ from "../../reader/page-json"
import { useState } from "kaiku"

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

type ResultProps = {
    hintSelectionState: HintSelectionState
    result: PJ.Result
    index: number
}

function Result({ hintSelectionState, result, index }: ResultProps) {
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

    /*
    let glossText = ""
    let maxGloss = 50

    for (const gloss of result.gloss) {
        if (glossText && glossText.length + gloss.length >= maxGloss && !expand) break
        if (glossText != "") glossText += "\n"
        glossText += gloss
        // glossText += gloss.replace(/ /g, "\u202F")
    }
    */
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

    for (const gloss of result.gloss) {
        if (glossPart.length >= maxGloss) {
            const missing = numGloss - glossPart.length
            if (expand && !extraExpand) {
                glossPart.push(<li className="gloss-more">(tap for {missing} more)</li>)
            }
            break
        }
        glossPart.push(<li>{gloss}</li>)
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
                    {text}
                </span>)}
            </div>)
        }
    }

    let conjText = result.conjugation

    return <div
        className={{
            "hint-container": true,
            "hint-selected": expand,
        }}
        onClick={() => {
            if (hintSelectionState.selectedIndex === index) {
                hintSelectionState.extraExpand = !hintSelectionState.extraExpand
            } else {
                hintSelectionState.selectedIndex = index
                hintSelectionState.extraExpand = false
            }
            window.queueMicrotask(() => {
                const element = document.querySelector(".hint-selected")
                if (element) {
                    console.log(element)
                    element.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                    })
                }
            })
        }}
    >
        <div className="hint-title">{titleText}</div>
        <div className="hint-content">
            {result.radicals ? <RadicalList radicals={result.radicals} /> : null}
            <ul className="hint-gloss">{glossPart}</ul>
            {conjText ? <div className="hint-conjugation">{conjText}</div> : null}
            {(kanjiText || kanaText) ? <div className="hint-text-container">
                {kanjiText ? <div>
                    <span className="hint-label">Writing: </span>
                    <span className="hint-text">{kanjiText}</span>
                </div> : null}
                {kanaText ? <div>
                    <span className="hint-label">Reading: </span>
                    <span className="hint-text">{kanaText}</span>
                </div> : null}
            </div> : null}
            {wkPart}
        </div>                
    </div>
}

type HintProps = {
    hint: PJ.Hint,
}
export function Hint({ hint }: HintProps) {
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
                    // @ts-ignore
                    key={ix.toString()} />)}
        </div>
    </div>
}
