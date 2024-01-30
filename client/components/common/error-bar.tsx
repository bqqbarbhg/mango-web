import { FC } from "kaiku";
import { ErrorReport, MangoError, closeError, globalState } from "../../state";

type ErrorEntryProps = { report: ErrorReport }
const ErrorEntry: FC<ErrorEntryProps> = ({ report }: ErrorEntryProps) => {
    const error = report.error
    let message: string = ""
    if (error instanceof MangoError) {
        message = error.message
    } else if (error instanceof Error) {
        message = error.message
    } else {
        message = error
    }

    function deleteEntry() {
        report.closed = true
        closeError(report.id)
    }

    return <li className={{
        "error-entry": true,
        "error-closed": !report.opened || report.closed,
    }}>
        <div className="error-message">
            <span className="error-cause">{report.context}: </span>
            <span className="error-info">{message}</span>
        </div>
        <button className="error-button" onClick={deleteEntry}>X</button>
    </li>
}

export function ErrorBar() {
    return <div className="error-parent">
        <ul className="error-list">
            {globalState.errors.map(err => <ErrorEntry report={err} key={err.id} />)}
        </ul>
    </div>
}
