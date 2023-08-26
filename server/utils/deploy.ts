import { exec } from "node:child_process"

function execStdout(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => exec(cmd, (error, stdout, stderr) => {
        if (error) {
            reject(error)
        } else {
            resolve(stdout)
        }
    }))
}

async function execStdoutTrim(cmd: string): Promise<string> {
    const result = await execStdout(cmd)
    return result.trim()
}

export async function quitIfOutdated() {
    await execStdout("git fetch")
    const headRev = await execStdoutTrim("git rev-parse HEAD")
    const remoteRev = await execStdoutTrim("git rev-parse @{u}")
    if (headRev !== remoteRev) {
        console.log("git revision changed.. quitting")
        process.exit(0)
    }
}
