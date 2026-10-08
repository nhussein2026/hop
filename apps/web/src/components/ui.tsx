// Hop's UI kit: toasts, dialogs, confirm, menus and small display pieces.
// Behaviour follows the prototype: native <dialog> (focus moves in, Esc closes, focus returns to
// the opener), undo in toasts instead of confirmation for cheap actions, confirm only for
// consequential ones.
import { useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Icon, Pad } from './Icon.tsx'
import { DialogBusyContext, DialogContext, ToastContext } from './ui-context.ts'
import type { DialogRender, ToastOptions } from './ui-context.ts'
import { sizeLabel } from '../lib/labels.ts'

/* ---- Toasts --------------------------------------------------------------------------- */
type ToastItem = ToastOptions & { id: number; message: string }

function Toast({ item, dismiss }: { item: ToastItem; dismiss: (id: number) => void }) {
  const timer = useRef<number>(undefined)
  const start = useCallback((ms: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => dismiss(item.id), ms)
  }, [dismiss, item.id])

  useEffect(() => {
    start(item.timeout ?? (item.action ? 6500 : 3500))
    return () => window.clearTimeout(timer.current)
  }, [item, start])

  return (
    <div className={`toast${item.type === 'error' ? ' toast-error' : ''}`} onMouseEnter={() => window.clearTimeout(timer.current)} onMouseLeave={() => start(2000)}>
      <Icon className="icon-sm" name={item.type === 'error' ? 'alertCircle' : 'check'} />
      <span className="toast-msg">{item.message}</span>
      {item.action && <button className="toast-action" onClick={() => { dismiss(item.id); item.action!.run() }} type="button">{item.action.label}</button>}
      <button aria-label="Dismiss" className="toast-action" onClick={() => dismiss(item.id)} type="button"><Icon className="icon-sm" name="x" /></button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(0)
  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), [])
  const toast = useCallback((message: string, options: ToastOptions = {}) => {
    const id = ++nextId.current
    setItems((current) => [...current, { ...options, id, message }].slice(-3))
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div aria-live="polite" className="toasts" role="status">{items.map((item) => <Toast dismiss={dismiss} item={item} key={item.id} />)}</div>
    </ToastContext.Provider>
  )
}

/* ---- Dialogs --------------------------------------------------------------------------- */

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialogs, setDialogs] = useState<{ id: number; node: ReactNode }[]>([])
  const nextId = useRef(0)

  const open = useCallback((render: DialogRender) => {
    const id = ++nextId.current
    const close = () => setDialogs((current) => current.filter((dialog) => dialog.id !== id))
    setDialogs((current) => [...current, { id, node: render(close) }])
    return close
  }, [])
  const closeAll = useCallback(() => setDialogs([]), [])

  return (
    <DialogContext.Provider value={{ open, closeAll }}>
      {children}
      {dialogs.map((dialog) => <div key={dialog.id}>{dialog.node}</div>)}
    </DialogContext.Provider>
  )
}

type DialogProps = {
  title: string
  desc?: ReactNode
  className?: string
  children?: ReactNode
  /** false: no footer. */
  foot?: ReactNode | false
  onClose: () => void
  /** Return an error message to show it at the top of the dialog. */
  onSubmit?: (form: HTMLFormElement, submitter: HTMLButtonElement | null) => Promise<string | void> | string | void
  initialFocus?: string
}

/** A native modal dialog. On phones it becomes a bottom sheet (see layout.css). */
export function Dialog({ title, desc, className, children, foot, onClose, onSubmit, initialFocus }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const titleId = useId()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const onCloseRef = useRef(onClose)
  useLayoutEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    const dialog = ref.current!
    const opener = document.activeElement as HTMLElement | null
    dialog.showModal()
    const first = initialFocus ? dialog.querySelector<HTMLElement>(initialFocus) : dialog.querySelector<HTMLElement>('input:not([type=hidden]):not([type=radio]):not([type=checkbox]), textarea, select, input[type=radio]:checked')
    first?.focus()
    const handleClose = () => {
      onCloseRef.current()
      if (opener && document.contains(opener)) opener.focus()
    }
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
    // Opening happens once per mount.
  }, [initialFocus])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onSubmit || busy) return
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    setBusy(true)
    try {
      const result = await onSubmit(event.currentTarget, submitter)
      setError(typeof result === 'string' ? result : '')
    } finally {
      if (ref.current?.open) setBusy(false)
    }
  }

  return (
    <dialog
      aria-labelledby={titleId}
      className={className}
      onClick={(event) => {
        if (event.target === ref.current) ref.current.close()
        if ((event.target as HTMLElement).closest('[data-close]')) ref.current?.close()
      }}
      ref={ref}
    >
      <DialogBusyContext.Provider value={busy}>
      <form className="dialog-inner" noValidate onSubmit={(event) => void submit(event)} ref={formRef}>
        <div className="dialog-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {desc && <p>{desc}</p>}
          </div>
          <button aria-label="Close" className="icon-btn" data-close type="button"><Icon name="x" /></button>
        </div>
        <div className="dialog-body">
          {error && <div className="banner banner-danger form-error" role="alert"><Icon name="alertCircle" /><div className="banner-body">{error}</div></div>}
          {children}
        </div>
        {foot !== false && <div className="dialog-foot">{foot}</div>}
      </form>
      </DialogBusyContext.Provider>
    </dialog>
  )
}

/** A dialog's submit button: shows a spinner while the dialog is saving. */
export function SubmitButton({ children, className = 'btn btn-primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const busy = useContext(DialogBusyContext)
  return <button {...props} aria-busy={busy || undefined} className={className} type="submit">{children}</button>
}

/* ---- Form fields ------------------------------------------------------------------------- */
type FieldBase = { name: string; label: string; id?: string; hint?: string; error?: string; optional?: boolean; required?: boolean }
type FieldProps = FieldBase & {
  /** An input type, or 'textarea' / 'select'. */
  type?: string
  defaultValue?: string | number | null
  placeholder?: string
  min?: number
  max?: number
  maxLength?: number
  autoComplete?: string
  readOnly?: boolean
  rows?: number
  options?: (string | [string, string])[]
  onChange?: (value: string) => void
}

export function Field(props: FieldProps) {
  const id = props.id ?? `f-${props.name}`
  const errorId = `${id}-err`
  const hintId = `${id}-hint`
  const common = {
    id,
    name: props.name,
    'aria-describedby': props.hint ? hintId : undefined,
    'aria-errormessage': props.error ? errorId : undefined,
    'aria-invalid': props.error ? true : undefined,
    'aria-required': props.required || undefined,
  }
  let control: ReactNode
  if (props.type === 'textarea') {
    control = <textarea {...common} className="textarea" defaultValue={props.defaultValue ?? ''} placeholder={props.placeholder} rows={props.rows ?? 3} />
  } else if (props.type === 'select') {
    const onChange = props.onChange
    control = (
      <select {...common} className="select" defaultValue={props.defaultValue ?? ''} onChange={onChange ? (event) => onChange(event.target.value) : undefined}>
        {(props.options ?? []).map((option) => {
          const [value, label] = Array.isArray(option) ? option : [option, option]
          return <option key={value} value={value}>{label}</option>
        })}
      </select>
    )
  } else {
    control = <input {...common} autoComplete={props.autoComplete} className="input" defaultValue={props.defaultValue ?? ''} max={props.max} maxLength={props.maxLength} min={props.min} placeholder={props.placeholder} readOnly={props.readOnly} type={props.type ?? 'text'} />
  }
  return (
    <div className="field">
      <label htmlFor={id}>{props.label}{props.optional && <> <span className="optional">(optional)</span></>}</label>
      {control}
      {props.hint && <span className="field-hint" id={hintId}>{props.hint}</span>}
      {props.error && <span className="field-error" id={errorId}><Icon className="icon-sm" name="alertCircle" />{props.error}</span>}
    </div>
  )
}

export function FieldError({ id, error }: { id?: string; error?: string }) {
  return error ? <span className="field-error" id={id}><Icon className="icon-sm" name="alertCircle" />{error}</span> : null
}

/**
 * A drop zone for one file: click to browse, or drag a file onto it. Once chosen, the file shows
 * as a chip that can be removed. `accept` lists extensions, such as ['.pdf', '.docx'].
 */
export function FilePicker({ label, hint, accept, maxBytes, value, onChange, error, optional, current, onRemoveCurrent }: {
  label: string
  hint: string
  accept: string[]
  maxBytes: number
  value: File | null
  onChange: (file: File | null, problem?: string) => void
  error?: string
  optional?: boolean
  /** A file already saved, shown until it is replaced or removed. */
  current?: { name: string; meta: string } | null
  onRemoveCurrent?: () => void
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  function choose(file: File | undefined) {
    if (!file) return
    const extension = `.${file.name.toLowerCase().split('.').pop()}`
    if (!accept.includes(extension)) onChange(null, `Choose a ${accept.map((a) => a.slice(1).toUpperCase()).join(' or ')} file.`)
    else if (file.size > maxBytes) onChange(null, `That file is ${sizeLabel(file.size)}. The limit is ${sizeLabel(maxBytes)}.`)
    else if (file.size === 0) onChange(null, 'That file is empty.')
    else onChange(file)
  }

  return (
    <div className="field">
      <span className="field-label" id={`${id}-label`}>{label}{optional && <> <span className="optional">(optional)</span></>}</span>
      {!value && current
        ? (
          <div className="file-chip">
            <span aria-hidden="true" className="file-chip-icon"><Icon name="file" /></span>
            <span className="file-chip-text"><span className="file-chip-name">{current.name}</span><span className="xs muted">{current.meta}</span></span>
            <button className="btn btn-sm" onClick={() => input.current?.click()} type="button">Replace</button>
            {onRemoveCurrent && <button aria-label={`Remove ${current.name}`} className="icon-btn" onClick={onRemoveCurrent} type="button"><Icon name="trash" /></button>}
          </div>
        )
        : value
        ? (
          <div className="file-chip">
            <span aria-hidden="true" className="file-chip-icon"><Icon name="file" /></span>
            <span className="file-chip-text"><span className="file-chip-name">{value.name}</span><span className="xs muted">{sizeLabel(value.size)}</span></span>
            <button aria-label={`Remove ${value.name}`} className="icon-btn" onClick={() => { onChange(null); if (input.current) input.current.value = '' }} type="button"><Icon name="x" /></button>
          </div>
        )
        : (
          <label
            className={`dropzone${over ? ' is-over' : ''}${error ? ' is-invalid' : ''}`}
            htmlFor={id}
            onDragLeave={() => setOver(false)}
            onDragOver={(event) => { event.preventDefault(); setOver(true) }}
            onDrop={(event) => { event.preventDefault(); setOver(false); choose(event.dataTransfer.files[0]) }}
          >
            <span aria-hidden="true" className="dropzone-icon"><Icon name="upload" /></span>
            <span className="dropzone-text"><strong>Choose a file</strong> or drag it here</span>
            <span className="xs muted">{hint}</span>
          </label>
        )}
      <input
        accept={accept.join(',')}
        aria-describedby={error ? `${id}-err` : undefined}
        aria-invalid={error ? true : undefined}
        aria-labelledby={`${id}-label`}
        className="visually-hidden"
        id={id}
        onChange={(event) => choose(event.target.files?.[0])}
        ref={input}
        type="file"
      />
      <FieldError error={error} id={`${id}-err`} />
    </div>
  )
}

/** Radio group styled as buttons. */
export function Segmented({ name, label, options, defaultValue, value, onChange, small }: {
  name: string
  label: ReactNode
  options: [string, ReactNode][]
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  small?: boolean
}) {
  const labelId = useId()
  const base = useId()
  return (
    <div className="field">
      <span className="field-label" id={labelId}>{label}</span>
      <div aria-labelledby={labelId} className={`segmented${small ? ' segmented-sm' : ''}`} role="radiogroup">
        {options.map(([optionValue, optionLabel]) => (
          <span key={optionValue} style={{ display: 'contents' }}>
            <input
              checked={value === undefined ? undefined : value === optionValue}
              defaultChecked={value === undefined ? defaultValue === optionValue : undefined}
              id={`${base}-${optionValue}`}
              name={name}
              onChange={onChange ? () => onChange(optionValue) : undefined}
              type="radio"
              value={optionValue}
            />
            <label htmlFor={`${base}-${optionValue}`}>{optionLabel}</label>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ---- Menus ---------------------------------------------------------------------------------- */
export type MenuItem = { label: string; icon: string; onSelect: () => void; danger?: boolean } | '-'

export function Menu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    wrap.current?.querySelector<HTMLButtonElement>('.menu button')?.focus()
    const outside = (event: MouseEvent) => { if (!wrap.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('click', outside)
    return () => document.removeEventListener('click', outside)
  }, [open])

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); event.stopPropagation() }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const buttons = [...(wrap.current?.querySelectorAll<HTMLButtonElement>('.menu button') ?? [])]
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
    }
  }

  return (
    <div className="menu-wrap" onKeyDown={onKeyDown} ref={wrap}>
      <button aria-expanded={open} aria-haspopup="true" aria-label={label} className="icon-btn" onClick={(event) => { event.stopPropagation(); setOpen(!open) }} ref={toggle} type="button"><Icon name="more" /></button>
      {open && (
        <div className="menu" role="menu">
          {items.map((item, index) => item === '-'
            ? <hr key={index} />
            : <button className={item.danger ? 'danger' : ''} key={item.label} onClick={() => { setOpen(false); item.onSelect() }} role="menuitem" type="button"><Icon className="icon-sm" name={item.icon} />{item.label}</button>)}
        </div>
      )}
    </div>
  )
}

/* ---- Display pieces ---------------------------------------------------------------------- */
export function Badge({ children, tone, icon }: { children: ReactNode; tone?: string; icon?: string | null }) {
  return <span className={`badge${tone ? ` badge-${tone}` : ''}`}>{icon && <Icon name={icon} />}{children}</span>
}

export function Empty({ title, body, action, actionLabel, pad = true, icon = 'leaf', secondary }: {
  title: string
  body?: ReactNode
  action?: () => void
  actionLabel?: string
  pad?: boolean
  icon?: string
  secondary?: boolean
}) {
  return (
    <div className="empty">
      <span className="empty-mark">{pad ? <Pad size={28} /> : <Icon className="icon-lg" name={icon} />}</span>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action && <button className={`btn${secondary ? '' : ' btn-primary'}`} onClick={action} type="button"><Icon className="icon-sm" name="plus" />{actionLabel}</button>}
    </div>
  )
}

export function ProgressBar({ pct, label = 'Progress' }: { pct: number; label?: string }) {
  return <span aria-label={label} aria-valuemax={100} aria-valuemin={0} aria-valuenow={pct} className="progress" role="progressbar"><span style={{ width: `${pct}%` }} /></span>
}

/** Section navigation: each section has its own URL, so these are links with aria-current. */
export function Tabs({ items, active, label }: { items: [string, string, string, number?][]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="tabs">
      {items.map(([key, text, href, count]) => <a aria-current={key === active ? 'page' : undefined} className="tab" href={href} key={key}>{text}{count ? <> <span className="count">{count}</span></> : null}</a>)}
    </nav>
  )
}

export function Banner({ tone, icon, title, children, action }: { tone: 'info' | 'warning' | 'danger' | 'success'; icon: string; title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={`banner banner-${tone}`} role={tone === 'danger' ? 'alert' : undefined}>
      <Icon name={icon} />
      <div className="banner-body">{title && <strong>{title}</strong>}{children && <span>{children}</span>}</div>
      {action}
    </div>
  )
}

export function DateChip({ date, large }: { date: string; large?: boolean }) {
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${date}T12:00:00Z`).getUTCDay()]
  return <span className={`date-chip${large ? ' date-chip-lg' : ''}`}><span>{weekday}</span><b className="num">{date.slice(8).replace(/^0/, '')}</b></span>
}

/** Live filter for a list of rows: hides rows whose text doesn't match. */
export function RowFilter({ id, label, placeholder, target }: { id: string; label: string; placeholder: string; target: string }) {
  return (
    <div className="search-field">
      <Icon className="icon-sm" name="search" />
      <label className="visually-hidden" htmlFor={id}>{label}</label>
      <input
        autoComplete="off"
        className="input"
        id={id}
        onInput={(event) => {
          const q = event.currentTarget.value.trim().toLowerCase()
          const list = document.querySelector(target)
          if (!list) return
          let shown = 0
          list.querySelectorAll<HTMLElement>('.row').forEach((row) => {
            const hit = (row.textContent ?? '').toLowerCase().includes(q)
            row.hidden = !hit
            if (hit) shown++
          })
          const empty = list.parentElement?.querySelector<HTMLElement>('.filter-empty')
          if (empty) empty.hidden = shown > 0
        }}
        placeholder={placeholder}
        type="search"
      />
    </div>
  )
}
