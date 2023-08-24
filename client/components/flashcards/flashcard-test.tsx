import { Component, useEffect, useState } from "kaiku";
import { Flashcard, globalState } from "../../state";
import * as V from "../../utils/validation"
import * as PJ from "../../reader/page-json"
import { apiCall } from "../../utils/api";
import { ResultContent } from "../overlay/hint";
import { clamp, lerp } from "../../utils/math";
import IconList from "@tabler/icons/list.svg"
import Icon from "../common/icon";

function getTime(): number {
    return performance.now() * 1e-3
}

// Increase minimum duration based on successive correct answers
const Min = 60
const Hour = 60 * Min
const Day = 24 * Hour
const flashcardCooldown = [
    0,
    2*Min, 15*Min, 30*Min,
    1*Hour, 2*Hour, 4*Hour,
    1*Day, 2*Day, 4*Day,
    7*Day, 14*Day, 30*Day,
    60*Day, 180*Day,
]

function scoreFlashcard(flashcard: Flashcard) {
    let score = 0
    for (let i = 0; i < flashcard.answersTotal; i++) {
        if (i >= 32) break

        const correct = (flashcard.answerHistory & (1 << i)) != 0

        // If the first one is incorrect always return zero score
        if (!correct && i == 0) break

        if (correct) {
            score += 1
        } else {
            score -= 1
        }

        if (score < 0) break
    }
    score = clamp(score, 0, flashcardCooldown.length - 1)

    return score
}

function getFlashcardCandidates(): Flashcard[] {
    const user = globalState.user
    if (!user) return []

    const timestamp = Date.now()*1e-3

    const result = []
    for (const flashcard of user.flashcards) {
        const score = scoreFlashcard(flashcard)
        const cooldownTimestamp = flashcard.answerTime*1e-3 + flashcardCooldown[score]!
        if (timestamp >= cooldownTimestamp) {
            result.push(flashcard)
        }
    }
    return result
}

type TouchState = "idle" | "horizontal" | "vertical"
type Touch = {
    identifier: number
    startTime: number
    startX: number
    startY: number
    posX: number
    posY: number
    state: TouchState
}

type Props = {
}

type State = {
    flashcard: Flashcard | null
    flashcardTime: number
    info: PJ.Result | null
    reveal: boolean
    expand: boolean
    extraExpand: boolean
    deltaX: number
    opacity: number
    answered: boolean
    answeredFast: boolean
    answerTime: number
    answerCommitted: boolean
    correct: boolean
    candidateCount: number
}

type PhysicsState = {
    prevX: number
    nextX: number
    velX: number
    targetX: number
    hasTarget: boolean
    updateTime: number
}

const physicsTimestep = 1.0 / 30.0

export class FlashcardTest extends Component<Props, State> {
    animationFrameToken: number | null = null
    touch: Touch | null = null
    physics: PhysicsState = {
        prevX: 0,
        nextX: 0,
        velX: 0,
        targetX: 0,
        hasTarget: false,
        updateTime: -1,
    }

    constructor(props: Props) {
        super(props)

        this.state = useState<State>({
            flashcard: null,
            flashcardTime: -1,
            info: null,
            reveal: false,
            expand: false,
            extraExpand: false,
            deltaX: 0,
            opacity: 0,
            answered: false,
            answeredFast: false,
            answerTime: -1,
            answerCommitted: false,
            correct: false,
            candidateCount: 0,
        })

        const updateInfo = async () => {
            const flashcard = this.state.flashcard
            if (!flashcard) return

            const result = await apiCall("GET /flashcards/:uuid", {
                uuid: flashcard.uuid,
            })

            this.state.info = V.validate(PJ.Result, result.info)
        }

        useEffect(() => {
            const { state } = this
            const user = globalState.user
            if (!user) return
            if (this.state.flashcard === null) {
                const candidates = getFlashcardCandidates()
                if (candidates.length === 0) return

                const index = Math.min(Math.floor(Math.random() * candidates.length), candidates.length - 1)
                state.flashcard = candidates[index] ?? null
                state.flashcardTime = getTime()
                state.candidateCount = candidates.length

                updateInfo()
                this.requestAnimationFrame()
            }
        })

    }

    reset() {
        const { state, physics } = this
        state.flashcard = null
        state.flashcardTime = -1
        state.info = null
        state.reveal = false
        state.expand = false
        state.extraExpand = false
        state.deltaX = 0
        state.answered = false
        state.correct = false
        state.opacity = 0
        state.answerCommitted = false
        physics.nextX = 0
        physics.prevX = 0
        physics.velX = 0
        physics.targetX = 0
    }

    onAnswer = (correct: boolean, fast: boolean) => async () => {
        const { state } = this
        const flashcard = state.flashcard
        if (!flashcard) return
        if (state.answered) return
        state.answered = true
        state.answeredFast = fast
        state.answerTime = getTime()
        state.correct = correct

        const result = await apiCall("POST /flashcards/:uuid/answer", {
            uuid: flashcard.uuid, correct,
        })

        const flashcards = globalState.user?.flashcards
        if (flashcards) {
            for (let i = 0; i < flashcards.length; i++) {
                if (flashcards[i]?.uuid === flashcard.uuid) {
                    flashcards[i] = {
                        ...flashcard,
                        ...result,
                    }
                    break
                }
            }
        }

        state.answerCommitted = true

        this.requestAnimationFrame()
    }

    onWrongAnswer = this.onAnswer(false, true)
    onRightAnswer = this.onAnswer(true, true)

    onTouchStart = (e: TouchEvent) => {
        const touch = e.changedTouches[0]
        if (!touch) return
        this.touch = {
            identifier: touch.identifier,
            startTime: getTime(),
            startX: touch.clientX,
            startY: touch.clientY,
            posX: touch.clientX,
            posY: touch.clientY,
            state: "idle",
        }
    }

    onTouchMove = (e: TouchEvent) => {
        const { touch } = this
        if (!touch) return

        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i]!
            if (t.identifier === touch.identifier) {
                touch.posX = t.clientX
                touch.posY = t.clientY
                this.requestAnimationFrame()
                return
            }
        }
    }

    onTouchEnd = (e: TouchEvent) => {
        const { touch, physics } = this
        if (!touch) return

        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i]!
            if (t.identifier === touch.identifier) {
                let answer = 0

                if (physics.nextX < -50) {
                    answer = -1
                } else if (physics.nextX > 50) {
                    answer = 1
                }

                const deltaX = t.clientX - touch.startX
                const deltaTime = Math.max(0.01, getTime() - touch.startTime)
                const velX = deltaX / deltaTime
                if (deltaTime < 0.5 && Math.abs(deltaX) > 80 && Math.abs(velX) > 800) {
                    answer = Math.sign(deltaX)
                }

                if (answer != 0) {
                    this.onAnswer(answer > 0, false)()
                }

                this.touch = null
                this.requestAnimationFrame()
                return
            }
        }
    }

    onTouchCancel = (e: TouchEvent) => {
        const { touch } = this
        if (!touch) return

        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i]!
            if (t.identifier === touch.identifier) {
                this.touch = null
                this.requestAnimationFrame()
                return
            }
        }
    }

    onReveal = () => {
        const { state } = this
        state.reveal = true
    }

    onExpand = () => {
        const { state } = this
        if (!state.reveal) {
            state.reveal = true
            return
        }
        if (!state.expand) {
            state.expand = true
        } else {
            state.extraExpand = !state.extraExpand
        }   
    }

    physicsStep() {
        const dt = physicsTimestep
        const { state, physics } = this

        physics.prevX = physics.nextX

        const lerpSpeed = physics.hasTarget ? 0.4 : 0.2
        physics.nextX = lerp(physics.nextX, physics.targetX, lerpSpeed)

        const delta = physics.targetX - physics.nextX 
        const constantSpeed = physicsTimestep * 20.0
        physics.nextX += clamp(delta, -constantSpeed, constantSpeed)

        if (physics.hasTarget) {
            physics.nextX *= state.reveal ? 0.7 : 0.15
        }
    }

    onAnimationFrame = () => {
        const { state, touch, physics } = this
        this.animationFrameToken = null

        const time = getTime()

        let targetX = 0
        let hasTarget = false
        if (touch) {
            const deltaX = touch.posX - touch.startX
            const deltaY = touch.posY - touch.startY

            if (touch.state === "idle") {
                if (Math.abs(deltaX) > 10.0) {
                    touch.state = "horizontal"
                } else if (Math.abs(deltaY) > 10.0) {
                    touch.state = "vertical"
                }
            }

            if (touch.state === "horizontal") {
                targetX = deltaX
                hasTarget = true
            }
        }

        let doReset = false
        if (state.answered) {
            const answerDuration = state.answeredFast ? 0.1 : 0.2
            const distance = state.answeredFast ? 200 : 600
            targetX = state.correct ? distance : -distance
            hasTarget = false

            const delta = time - state.answerTime
            const alpha = Math.min(delta / answerDuration, 1.0)
            state.opacity = 1.0 - alpha

            if (alpha >= 1.0 && state.answerCommitted) {
                doReset = true
            }
        }

        let flashcardFade = 1.0
        if (state.flashcard) {
            const fadeDuration = 0.1
            flashcardFade = Math.min((time - state.flashcardTime) / fadeDuration, 1.0)
            state.opacity = flashcardFade
        }

        physics.targetX = targetX
        physics.hasTarget = hasTarget

        const maxUpdates = 1
        let updateTime = physics.updateTime
        if (updateTime < 0.0) {
            updateTime = time
        }
        let updateCount = 0
        while (updateTime < time) {
            this.physicsStep()
            updateTime += physicsTimestep
            if (++updateCount >= maxUpdates) {
                updateTime = time
            }
        }
        physics.updateTime = updateTime
        const delta = time - physics.updateTime + physicsTimestep
        const alpha = delta / physicsTimestep

        state.deltaX = lerp(physics.prevX, physics.nextX, alpha)

        if (Math.abs(state.deltaX) > 0.01 || Math.abs(physics.targetX) > 0.01 || state.answered || flashcardFade < 1.0) {
            this.requestAnimationFrame()
        }

        if (doReset) {
            this.reset()
        }
    }

    requestAnimationFrame() {
        if (this.animationFrameToken === null) {
            this.animationFrameToken = window.requestAnimationFrame(this.onAnimationFrame)
        }
    }

    render() {
        const { state } = this

        const flashcard = state.flashcard
        if (!flashcard) return null

        const getTransform = () => {
            const { deltaX } = state
            return `translate(${deltaX}px)`
        }

        return <div className="flashcard-test">
            <div className="flashcard-header">
                <div className="flashcard-filler" />
                <div className="flashcard-left">{state.candidateCount} left</div>
                <button className="flashcard-list-button">
                    <Icon svg={IconList} />
                </button>
            </div>
            <div style={{ flexGrow: "1" }} />
            <div
                className="flashcard-card-parent"
                onTouchStart={this.onTouchStart}
                onTouchMove={this.onTouchMove}
                onTouchEnd={this.onTouchEnd}
                onTouchCancel={this.onTouchCancel}
                onClick={this.onExpand}
                style={{
                    transform: getTransform,
                    opacity: () => `${state.opacity}`,
                }}
            >
                <div lang="ja-jp" className="flashcard-example">
                    {flashcard.example}
                </div>
                <div className="flashcard-card">
                    <div lang="ja-jp" className="flashcard-title">
                        {flashcard.word}
                    </div>
                    {state.info && state.reveal ?
                        <div className="flashcard-content">
                            <ResultContent
                                result={state.info}
                                expand={state.expand}
                                extraExpand={state.extraExpand}
                                conjugation={true}
                            />
                        </div>
                            : null }
                </div>
            </div>
            <div className="flashcard-buttons">
                {state.reveal ? <>
                    <button className="flashcard-button wrong" onClick={this.onWrongAnswer}>
                        Wrong
                    </button>
                    <button className="flashcard-button right" onClick={this.onRightAnswer}>
                        Right
                    </button>
                </> : <>
                    <button className="flashcard-button" onClick={this.onReveal}>
                        Reveal
                    </button>
                </>}
            </div>
            <div style={{ flexGrow: "3" }} />
        </div>
    }
}
