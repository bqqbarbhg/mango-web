import { useEffect, useRef, useState } from "kaiku"
import { Volume, globalState, navigateTo, parseRoute } from "../../state"
import { Link } from "../common/link"

let instanceIndex = 0

type Props = {
    volume: Volume
}
export function Volume(props: Props) {
    const { volume } = props
    const { path, info } = volume.volume
    const imgRef = useRef<HTMLElement>()
    const state = useState({
        hide: false,
    })

    const url = `${volume.sourceUrl}/${path}`

    const href = `/read/${path}?source=${volume.sourceUuid}`
    const imgSrc = `${url}/cover.jpg`
    const imgDst = volume.latestPage !== null ? `${url}/page${volume.latestPage.toString().padStart(3, "0")}.thumb.jpg` : imgSrc
    const onClick = (e: MouseEvent) => {
        if (imgRef.current) {
            const rect = imgRef.current.getBoundingClientRect()
            globalState.transitionRoute = parseRoute(new URL(href, "https://dummy"))

            const windowWidth = window.innerWidth
            const windowHeight = window.innerHeight
            const windowAspect = windowWidth / windowHeight
            const imageAspect = rect.width / rect.height
            let dstRect = null
            if (imageAspect < windowAspect) {
                dstRect = {
                    x: windowWidth / 2 - windowHeight * imageAspect / 2,
                    y: 0,
                    width: windowHeight * imageAspect,
                    height: windowHeight,
                }
            } else {
                dstRect = {
                    x: 0,
                    y: windowHeight / 2 -  windowWidth / imageAspect / 2,
                    width: windowWidth,
                    height: windowWidth / imageAspect,
                }
            }

            globalState.transition = {
                src: {
                    rect: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height,
                    },
                    image: imgSrc,
                    opacity: 0.0,
                },
                dst: {
                    rect: dstRect,
                    image: imgDst,
                    opacity: 1.0,
                },
                startTime: performance.now() * 1e-3,
                duration: 0.25,
                initialized: false,
                started: false,
                done: false,
                onStart: () => {
                    state.hide = true
                }
            }
        }
        e.preventDefault()
        return true
    }

    const index = ++instanceIndex

    useEffect(() => {
        if (globalState.requestTransitionFromVolume && imgRef.current) {
            if (globalState.requestTransitionFromVolume === path) {
                globalState.requestTransitionFromVolume = null

                state.hide = true
                window.setTimeout(() => {
                    const img = imgRef.current!
                    const rect = {
                        x: img.offsetLeft,
                        y: img.offsetTop,
                        width: img.offsetWidth,
                        height: img.offsetHeight,
                    }

                    const windowWidth = window.innerWidth
                    const windowHeight = window.innerHeight
                    const windowAspect = windowWidth / windowHeight
                    const imageAspect = rect.width / rect.height
                    let dstRect = null
                    if (imageAspect < windowAspect) {
                        dstRect = {
                            x: windowWidth / 2 - windowHeight * imageAspect / 2,
                            y: 0,
                            width: windowHeight * imageAspect,
                            height: windowHeight,
                        }
                    } else {
                        dstRect = {
                            x: 0,
                            y: windowHeight / 2 -  windowWidth / imageAspect / 2,
                            width: windowWidth,
                            height: windowWidth / imageAspect,
                        }
                    }

                    globalState.transition = {
                        src: {
                            rect: dstRect,
                            image: imgDst,
                            opacity: 1.0,
                        },
                        dst: {
                            rect: {
                                x: rect.x,
                                y: rect.y,
                                width: rect.width,
                                height: rect.height,
                            },
                            image: imgSrc,
                            opacity: 0.0,
                        },
                        startTime: performance.now() * 1e-3,
                        duration: 0.25,
                        initialized: false,
                        started: false,
                        done: false,
                        onEnd: () => {
                            globalState.route = globalState.transitionRoute!
                            globalState.transitionRoute = null
                            globalState.transition = null
                            state.hide = false
                        },
                    }
                }, 0)
            }
        }
    })

    return <div style={{ visibility: state.hide ? "hidden" : "visible" }}>
        <Link onClick={onClick} href={href}>
            <img ref={imgRef} src={imgSrc} />
        </Link>
        <h3>{info.title.en}</h3>
        {info.title.jp ? <h4>{info.title.jp}</h4> : null}
        {info.volume !== null ? <h4>{info.volume}</h4> : null}
    </div>
}
