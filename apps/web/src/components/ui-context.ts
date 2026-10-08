// Contexts and form helpers behind the UI kit in ui.tsx.
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

export type ToastOptions = { type?: 'error'; action?: { label: string; run: () => void }; timeout?: number }

export const ToastContext = createContext<(message: string, options?: ToastOptions) => void>(() => undefined)

export const useToast = () => useContext(ToastContext)

export type DialogRender = (close: () => void) => ReactNode
type DialogApi = { open: (render: DialogRender) => () => void; closeAll: () => void }

export const DialogContext = createContext<DialogApi>({ open: () => () => undefined, closeAll: () => undefined })

export const useDialogs = () => useContext(DialogContext)

export const DialogBusyContext = createContext(false)

/** Close the dialog a form belongs to. Its onClose then removes it. */
export const closeDialog = (form: HTMLFormElement) => form.closest('dialog')?.close()

/** Read a trimmed text value from a form. */
export const formText = (form: HTMLFormElement, name: string) => String(new FormData(form).get(name) ?? '').trim()

/** Focus the first invalid control, opening a closed <details> around it. */
export function focusFirstInvalid(form: HTMLFormElement | null) {
  window.setTimeout(() => {
    const bad = form?.querySelector<HTMLElement>('[aria-invalid="true"]')
    const details = bad?.closest('details')
    if (details) details.open = true
    bad?.focus()
  }, 0)
}

