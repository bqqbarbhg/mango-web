
const japaneseRegex = /[\u3400-\u4DB5\u4E00-\u9FCB\uF900-\uFA6A\u3041-\u3096\u30A0-\u30FF「|」？！、。]+/gu

export function InlineJapanese({ text }: {
    text: string
}) {
    const re = new RegExp(japaneseRegex)
    let result: RegExpExecArray | null
    let prevIndex = 0
    let pieces = []
    while ((result = re.exec(text)) !== null) {
        const index = result.index
        if (index > prevIndex) {
            pieces.push(text.substring(prevIndex, index))
        }
        pieces.push(<span lang="ja-jp">{result[0]}</span>)
        prevIndex = re.lastIndex
    }
    if (prevIndex < text.length) {
        pieces.push(text.substring(prevIndex))
    }
    return <>{...pieces}</>
}
