import * as V from "../utils/validation"

export const Coordinate = V.type("Coordinate", V.tuple([V.number, V.number]))
export type Coordinate = V.ValidatorResult<typeof Coordinate>

export const AABB = V.type("AABB", V.object({
    min: Coordinate,
    max: Coordinate,
}))
export type AABB = V.ValidatorResult<typeof AABB>

export const Word = V.type("Word", V.object({
    text: V.maybe(V.string),
    begin: V.integer,
    end: V.integer,
    aabb: AABB,
    break: V.any,
}))
export type Word = V.ValidatorResult<typeof Word>

export const Definition = V.type("Definition", V.object({
    text: V.string,
    primary: V.boolean,
    score: V.number,
    info: V.array(V.string),
}))
export type Definition = V.ValidatorResult<typeof Definition>

export const Radical = V.type("Radical", V.object({
    name: V.string,
    image: V.string,
}))
export type Radical = V.ValidatorResult<typeof Radical>

export const WkBodyText = V.type("WkBodyText", V.maybe(V.union([
    V.array(V.object({
        type: V.string,
        text: V.string,
    })),
    V.null_,
])))
export type WkBodyText = V.ValidatorResult<typeof WkBodyText>

export const Result = V.type("Result", V.object({
    query: V.string,
    kanji: V.array(Definition),
    kana: V.array(Definition),
    gloss: V.array(V.string),
    score: V.number,
    conjugation: V.string,
    radicals: V.maybe(V.array(Radical)),
    wk_meaning_mnemonic: WkBodyText,
    wk_meaning_hint: WkBodyText,
    wk_reading_mnemonic: WkBodyText,
    wk_reading_hint: WkBodyText,
}))
export type Result = V.ValidatorResult<typeof Result>

export const Hint = V.type("Hint", V.object({
    begin: V.integer,
    end: V.integer,
    results: V.array(Result),
}))
export type Hint = V.ValidatorResult<typeof Hint>

export const Paragraph = V.type("Paragraph", V.object({
    text: V.string,
    aabb: AABB,
    words: V.array(Word),
    symbols: V.array(Word),
    hints: V.array(Hint),
    alt_hints: V.array(Hint),
    break: V.maybe(V.any),
}))
export type Paragraph = V.ValidatorResult<typeof Paragraph>

export const Cluster = V.type("Cluster", V.object({
    paragraphs: V.array(V.integer),
    translation: V.string,
    aabb: AABB,
}))
export type Cluster = V.ValidatorResult<typeof Cluster>

export const Page = V.type("Page", V.object({
    paragraphs: V.array(Paragraph),
    clusters: V.array(Cluster),
    resolution: Coordinate,
}))
export type Page = V.ValidatorResult<typeof Page>

function yieldTick() {
    return new Promise((resolve, reject) => window.setTimeout(resolve, 1))
}

const ShallowPage = V.type("ShallowPage", V.object({
    paragraphs: V.array(V.any),
    clusters: V.array(V.any),
    resolution: Coordinate,
}))

export async function validatePageAsync(page: any): Promise<Page> {
    const shallow = V.validate(ShallowPage, page)
    for (let i = 0; i < shallow.paragraphs.length; i++) {
        await yieldTick()
        shallow.paragraphs[i] = V.validate(Paragraph, shallow.paragraphs[i])
    }
    for (let i = 0; i < shallow.clusters.length; i++) {
        await yieldTick()
        shallow.clusters[i] = V.validate(Cluster, shallow.clusters[i])
    }
    return shallow as Page
}
