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
}

type ResultProps = {
    hintSelectionState: HintSelectionState
    result: PJ.Result
    index: number
}

function Result({ hintSelectionState, result, index }: ResultProps) {
    const expand = hintSelectionState.selectedIndex == index

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

    let glossText = ""
    let maxGloss = 50

    for (const gloss of result.gloss) {
        if (glossText && glossText.length + gloss.length >= maxGloss && !expand) break
        if (glossText != "") glossText += ", "
        glossText += gloss
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
        onClick={() => { hintSelectionState.selectedIndex = index }}
    >
        <div className="hint-title">{titleText}</div>
        {result.radicals ? <RadicalList radicals={result.radicals} /> : null}
        <div className="hint-gloss">{glossText}</div>
        {conjText ? <div className="hint-conjugation">{conjText}</div> : null}
        {kanjiText ? <div>
            <span className="hint-label">Writing: </span>
            <span className="hint-text">{kanjiText}</span>
        </div> : null}
        {kanaText ? <div>
            <span className="hint-label">Reading: </span>
            <span className="hint-text">{kanaText}</span>
        </div> : null}
        {wkPart}
    </div>
}

type HintProps = {
    hint: PJ.Hint,
}
export function Hint({ hint }: HintProps) {
    const hintSelectionState = useState({ selectedIndex: -1 })
    return <div className="overlay-top-scroll">
        <div>
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
