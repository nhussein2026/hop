import { useCallback } from 'react'
import type { ReactNode } from 'react'
import { Dialog } from './ui.tsx'
import { useDialogs } from './ui-context.ts'

type ConfirmOptions = { title: string; body: ReactNode; confirmLabel: string; cancelLabel?: string; tone?: 'danger' }

/** Confirmation, only for destructive or irreversible actions. */
export function useConfirm() {
  const { open } = useDialogs()
  return useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
    let confirmed = false
    open((close) => (
      <Dialog
        className="dialog-sm"
        foot={<><button className="btn" data-close type="button">{options.cancelLabel ?? 'Cancel'}</button><button className={`btn ${options.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} type="submit">{options.confirmLabel}</button></>}
        initialFocus=".dialog-foot [data-close]"
        onClose={() => { close(); resolve(confirmed) }}
        onSubmit={(form) => { confirmed = true; form.closest('dialog')?.close() }}
        title={options.title}
      >
        <p className="muted" style={{ lineHeight: 'var(--lh-read)' }}>{options.body}</p>
      </Dialog>
    ))
  }), [open])
}

