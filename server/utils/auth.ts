import { randomBytes } from "node:crypto"
import fs from "node:fs"
import { sign, verify } from "jsonwebtoken"
import { globalOptions } from "./options"

type TokenPayload = {
    sessionId: number
    userId: number
}

let jwtKey: Buffer
export function setupJwt() {
    const jwtKeyFile = `${globalOptions.root}/jwt-key`
    try {
        fs.statSync(jwtKeyFile)
    } catch (err) {
        fs.writeFileSync(jwtKeyFile, randomBytes(256))
    }
    jwtKey = fs.readFileSync(jwtKeyFile)
}

export function signJwt(payload: TokenPayload): string {
    return sign(payload, jwtKey)
}

export function verifyJwt(jwtToken: string): TokenPayload {
    return verify(jwtToken, jwtKey, { complete: true }).payload as TokenPayload
}

