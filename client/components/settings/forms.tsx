import { Child } from "kaiku"
import * as css from "./forms.module.css"
import Icon from "../common/icon"
import IconDots from "@tabler/icons/dots.svg"

export function Form(props: {
    children: any
    className?: ClassName
    onSubmit: (e: SubmitEvent) => void,
}) {
    const { children, onSubmit } = props
    return <form
        onSubmit={onSubmit}
        className={props.className ? [css.form, props.className] : css.form}
    >
        {children}
    </form>
}

export function FormHeading({ children }: {
    children: Child | Child[]
}) {
    return <h3 className={css.formHeading}>
        {children}
    </h3>
}

export function FormGroup({ title }: {
    title: string
}) {
    return <div className={css.group}>{title}</div>
}

export function FormInputText(props: {
    data: any
    prop: string
    label: string
    type?: string
    disabled?: boolean
    required?: boolean
    ref?: any
    id?: string
    onInput?: (e: InputEvent) => void,
}) {
    const { data, prop, label } = props
    const idKey = props.id ?? prop
    const id = `form-${idKey}`
    const onInput = props.onInput ?? ((e: InputEvent) => {
        data[prop] = (e.target as HTMLInputElement).value
    })
    return <div className={css.inputParent}>
        <input
            id={id}
            type={props.type ?? "text"}
            className={css.input}
            value={() => data[prop]}
            disabled={props.disabled}
            required={props.required}
            ref={props.ref}
            onInput={onInput} />
        <label
            for={id}
            className={css.label}
        >
            {label}
        </label>
    </div>
}

export type Option = {
    key: string
    label: string
}

export function FormInputSelect(props: {
    data: any
    prop: string
    label: string
    options: Option[]
    id?: string
    onInput?: (e: InputEvent) => void,
}) {
    const { data, prop, label, options } = props
    const idKey = props.id ?? prop
    const id = `form-${idKey}`
    const onInput = props.onInput ?? ((e: InputEvent) => {
        data[prop] = (e.target as HTMLInputElement).value
    })
    return <div className={css.inputParent}>
        <select
            id={id}
            className={css.input}
            value={() => data[prop]}
            onInput={onInput}
        >
            {options.map(opt =>
                <option
                    value={opt.key}
                    selected={data[prop] === opt.key}
                >
                    {opt.label}
                </option>)}
        </select>
        <label
            for={id}
            className={css.label}
        >
            {label}
        </label>
    </div>
}

export function FormInputSubmit(props: {
    label: string
    disabled?: boolean
}) {
    const { label } = props
    return <div className={css.inputParent}>
        <input
            type="submit"
            className={css.submit}
            value={label}
            disabled={props.disabled}
        />
    </div>
}

type ClassName = string | ClassName[] | Record<string, boolean>

export function FormButton(props: {
    children: Child | Child[]
    onClick: (e: MouseEvent) => void
    className?: ClassName
}) {
    const { children } = props
    return <button
        className={props.className ? [css.button, props.className] : css.button}
        onClick={props.onClick}
    >
        {children}
    </button>
}

export function FormList(props: {
    children: Child | Child[]
}) {
    return <ul className={css.list}>
        {props.children}
    </ul>
}

export function FormListEntry(props: {
    children: Child | Child[]
    className?: ClassName
}) {
    return <ul
        className={props.className ? [css.listEntry, props.className] : css.listEntry}
    >
        {props.children}
    </ul>
}

export function FormMenuButton(props: {
    onClick: (e: MouseEvent) => void
}) {
    return <button className={css.optionsButton} onClick={props.onClick}>
        <Icon svg={IconDots} />
    </button>
}
