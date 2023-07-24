import { ErrorReport, MangoError, globalState } from "../../state";

function ErrorEntry(props: { report: ErrorReport }) {
    let message: string = `${props.report.context}: `
    const error = props.report.error
    if (error instanceof MangoError) {
        message += `${error.message} (${error.kind})`
    } else if (error instanceof Error) {
        message += `${error.message} (internal)`
    } else {
        message += error
    }

    const id = props.report.id
    function deleteEntry() {
        globalState.errors = globalState.errors.filter(e => e.id !== id)
    }

    return <li>
        <span>{message}</span>
        <button onClick={deleteEntry}>X</button>
    </li>
}

export function ErrorBar() {
    return <div>
        <ul>
            {globalState.errors.map(err => <ErrorEntry report={err} key={err.id} />)}
        </ul>
    </div>
}
