import { randomBytes } from "node:crypto"
import { getUserJwtKeyById } from "../database/user"
import { JwtPayload, sign, verify } from "jsonwebtoken"

const jwtCache: Map<string, Buffer> = new Map()

type TokenPayload = {
    id: string
    username: string
}

export function generateJwtKey(): string {
    return randomBytes(256).toString("hex")
}

export async function getJwtKey(userId: string): Promise<Buffer> {
    const cached = jwtCache.get(userId)
    if (cached !== undefined) return cached

    console.log(userId)
    const hexKey = await getUserJwtKeyById(userId)
    if (!hexKey) throw new Error(`failed to get user JWT key: ${userId}`)

    const key = Buffer.from(hexKey, "hex")
    jwtCache.set(userId, key)
    return key
}

export async function signJwtToken(userId: string, payload: TokenPayload): Promise<string> {
    const key = await getJwtKey(userId)
    const token = sign(payload, key)

    return `${userId}-${token}`
}

export async function verifyJwtToken(userId: string, jwtToken: string): Promise<TokenPayload> {
    const key = await getJwtKey(userId)
    return verify(jwtToken, key, { complete: true }).payload as TokenPayload
}

