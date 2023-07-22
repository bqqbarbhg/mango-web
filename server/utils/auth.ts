import { randomBytes } from "node:crypto"
import fs from "node:fs"
import { sign, verify } from "jsonwebtoken"

type TokenPayload = {
    sessionId: number
    userId: number
}

const jwtKeyFile = "build/jwt-key"
try {
    fs.statSync(jwtKeyFile)
} catch (err) {
    fs.writeFileSync(jwtKeyFile, randomBytes(256))
}
const jwtKey = fs.readFileSync(jwtKeyFile)

export function signJwt(payload: TokenPayload): string {
    return sign(payload, jwtKey)
}

export function verifyJwt(jwtToken: string): TokenPayload {
    return verify(jwtToken, jwtKey, { complete: true }).payload as TokenPayload
}

