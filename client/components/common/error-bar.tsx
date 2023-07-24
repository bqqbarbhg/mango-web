import { ErrorReport, MangoError, globalState } from "../../state";

function ErrorEntry(report: ErrorReport) {
    let message: string = `${report.context}: `
    const error = report.error
    if (error instanceof MangoError) {
        message += `${error.message} (${error.kind})`
    } else if (error instanceof Error) {
        message += `${error.message} (internal)`
    } else {
        message += error
    }
    return <li>
        {message}
    </li>
}

export function ErrorBar() {
    return <div>
        <ul>
            {globalState.errors.map(err => ErrorEntry(err))}
        </ul>
    </div>
}
