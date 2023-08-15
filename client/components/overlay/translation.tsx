
export function Translation({ text }: { text: string }) {
    return <div className="top-scroll">
        <div className="translation-container">
            <div className="translation-label">Translation</div>
            <div className="translation-text">{text}</div>
        </div>
    </div>
}
