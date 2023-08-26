import { apiRoute } from "../utils/api";
import { quitIfOutdated } from "../utils/deploy";

let deployKey: string | null = null

export function setDeployKey(key: string) {
    deployKey = key
}

apiRoute("POST /deploy/:key", async (req) => {
    if (deployKey && req.key === deployKey) {
        setTimeout(quitIfOutdated, 1000)
    }
    return { }
})
