import { useEffect, useRef, useState } from "kaiku"
import { Volume, globalState, navigateTo, parseRoute, transitionTo } from "../../state"
import { Link } from "../common/link"
import { sourceFetchBlob } from "../../utils/source"

async function loadImage(url: string): Promise<HTMLImageElement> {
    const image = new Image()
    return new Promise((resolve, reject) => {
        image.addEventListener("load", () => resolve(image))
        image.addEventListener("error", (err) => reject(err))
        image.src = url
    })
}

type Props = {
    volume: Volume
}
export function Volume(props: Props) {
    const { volume } = props
    const { path, info } = volume.volume
    const imgRef = useRef<HTMLElement>()
    const state = useState({
        hide: false,
        imgSrc: "",
    })


    useEffect(() => {
        sourceFetchBlob(volume.source, `${path}/cover.jpg`)
            .then((blob) => {
                state.imgSrc = URL.createObjectURL(blob)
            })
    })

    const url = `${volume.source.url}/${path}`

    const href = `/read/${path}?source=${volume.source.url}`
    const onClick = async (e: MouseEvent) => {
        e.preventDefault()

        const imgDstPath = volume.latestPage !== null ? `${path}/page${volume.latestPage.toString().padStart(3, "0")}.thumb.jpg` : `${path}/cover.jpg`
        const imgDstBlob = await sourceFetchBlob(volume.source, imgDstPath)
        const imgDstUrl = URL.createObjectURL(imgDstBlob)
        const imgDst = await loadImage(imgDstUrl)

        if (imgRef.current) {
            const srcRect = imgRef.current.getBoundingClientRect()
            transitionTo(href)

            const windowWidth = window.innerWidth
            const windowHeight = window.innerHeight
            const windowAspect = windowWidth / windowHeight
            const imageAspect = imgDst.width / imgDst.height
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
                        x: srcRect.x,
                        y: srcRect.y,
                        width: srcRect.width,
                        height: srcRect.height,
                    },
                    image: state.imgSrc,
                    opacity: 0.0,
                },
                dst: {
                    rect: dstRect,
                    image: imgDstUrl,
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
        return true
    }

    useEffect(() => {
        const { transitionRequest } = globalState
        if (transitionRequest && imgRef.current && state.imgSrc !== "") {
            if (transitionRequest.volumePath === path) {
                globalState.transitionRequest = null

                state.hide = true
                window.setTimeout(async () => {
                    const imgDstPath = volume.latestPage !== null ? `${path}/page${volume.latestPage.toString().padStart(3, "0")}.thumb.jpg` : `${path}/cover.jpg`
                    const imgDstBlob = await sourceFetchBlob(volume.source, imgDstPath)
                    const imgDstUrl = URL.createObjectURL(imgDstBlob)

                    const img = imgRef.current!
                    const rect = {
                        x: img.offsetLeft,
                        y: img.offsetTop,
                        width: img.offsetWidth,
                        height: img.offsetHeight,
                    }

                    globalState.transition = {
                        src: {
                            rect: transitionRequest.srcRect,
                            image: imgDstUrl,
                            opacity: 1.0,
                        },
                        dst: {
                            rect: {
                                x: rect.x,
                                y: rect.y,
                                width: rect.width,
                                height: rect.height,
                            },
                            image: state.imgSrc,
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
            <img ref={imgRef} src={state.imgSrc} style={{width:"200px", height:"300px"}} />
        </Link>
        <h3>{info.title.en}</h3>
        {info.title.jp ? <h4 lang="ja-jp">{info.title.jp}</h4> : null}
        {info.volume !== null ? <h4>{info.volume}</h4> : null}
    </div>
}
