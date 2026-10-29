// Notes and accounts dialogs: a quick note, and an account or subscription (never its password).
import { useState } from 'react'
import { CARD_NUMBER, CURRENCIES } from '@hop/domain'
import { looksLikeSecret } from '../lib/accounts.ts'
import { BILLING_CYCLE_OPTIONS } from '../lib/labels.ts'
import { titleFrom } from '../lib/notes.ts'
import { splitList } from '../lib/uni.ts'
import type { Account, AccountStatus, BillingCycle, Currency } from '../lib/types.ts'
import { useAccountActions } from '../store/account-actions.ts'
import { useUniActions } from '../store/uni-actions.ts'
import { useHop } from '../store/store.ts'
import { Dialog, Field, Segmented, SubmitButton } from '../components/ui.tsx'
import { useConfirm } from '../components/confirm.tsx'
import { closeDialog, focusFirstInvalid, formText } from '../components/ui-context.ts'

type Errors = Record<string, string>

/* ---- A new note ------------------------------------------------------------------------- */
export function NoteEditor({ topics: preset = [], close }: { topics?: string[]; close: () => void }) {
  const { data } = useHop()
  const actions = useUniActions()
  const [error, setError] = useState('')
  const known = [...new Set([...preset, ...data.resources.filter((r) => r.kind === 'note').flatMap((r) => r.topics)])].sort()

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const body = String(fd.get('body') ?? '')
    setError(body.trim() ? '' : 'Write something first.')
    if (!body.trim()) return focusFirstInvalid(form)
    const topics = [...new Set([...fd.getAll('topics').map(String), ...splitList(formText(form, 'newTopics'))])]
    const saved = await actions.library.add({ kind: 'note', title: formText(form, 'title') || titleFrom(body), body, topics, pinned: fd.get('pinned') === 'on' }, null, 'Note saved')
    if (saved) closeDialog(form)
  }

  return (
    <Dialog foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Save note</SubmitButton></>} initialFocus="#nn-body" onClose={close} onSubmit={submit} title="New note">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="nn-body">Note</label>
          <textarea aria-invalid={error ? true : undefined} className="textarea note-body" id="nn-body" name="body" placeholder="Anything to remember later." rows={8} />
          {error && <span className="field-error">{error}</span>}
        </div>
        <Field hint="Leave it empty to use the first line." label="Title" name="title" optional />
        <fieldset className="field">
          <legend className="field-label">Topics</legend>
          {known.length > 0 && <div className="check-chips">{known.map((topic) => <label className="check-chip" key={topic}><input defaultChecked={preset.includes(topic)} name="topics" type="checkbox" value={topic} /><span>{topic}</span></label>)}</div>}
          <label className="visually-hidden" htmlFor="nn-newtopics">New topics</label>
          <input className="input" id="nn-newtopics" name="newTopics" placeholder="New topics, comma separated" style={{ marginTop: 6 }} />
        </fieldset>
        <label className="check-line"><input name="pinned" type="checkbox" /> Pin it to the top</label>
      </div>
    </Dialog>
  )
}

/* ---- An account or subscription --------------------------------------------------------- */
const STATUS_OPTIONS: [AccountStatus, string][] = [['active', 'Active'], ['trial', 'Free trial'], ['cancelled', 'Cancelled']]
const CURRENCY_OPTIONS = CURRENCIES.map((c): [string, string] => [c, c])

export function AccountEditor({ account, close }: { account?: Account | null; close: () => void }) {
  const { data } = useHop()
  const actions = useAccountActions()
  const confirm = useConfirm()
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<AccountStatus>(account?.status ?? 'active')
  const [cycle, setCycle] = useState<BillingCycle>(account?.cycle ?? 'none')
  const [currency, setCurrency] = useState<Currency>(account?.currency ?? 'TRY')
  const paid = cycle !== 'none' || status === 'trial'
  // Monthly and yearly charges can log themselves in Finances, from a wallet in the same currency.
  const logsItself = paid && (cycle === 'monthly' || cycle === 'yearly') && data.wallets.length > 0
  const wallets = data.wallets.filter((w) => !w.archived && w.currency === currency).map((w): [string, string] => [w.id, w.name])

  async function submit(form: HTMLFormElement) {
    const name = formText(form, 'name')
    const url = formText(form, 'url')
    const costText = formText(form, 'cost')
    const cost = costText ? Number(costText.replace(',', '.')) : null
    const next: Errors = {}
    if (!name) next.name = 'Name the service.'
    if (url && !/^https?:\/\/\S+\.\S+/.test(url)) next.url = 'Use a full link starting with https://'
    if (cost !== null && (Number.isNaN(cost) || cost < 0)) next.cost = 'Use a number, like 59.99.'
    if (status === 'trial' && !formText(form, 'renewsOn')) next.renewsOn = 'Add the day the trial ends, so Hop can remind you.'
    // Hop never stores card numbers; the server refuses them too.
    for (const field of ['login', 'purpose', 'payment', 'notes']) {
      if (CARD_NUMBER.test(formText(form, field))) next[field] = 'That looks like a card number. Hop doesn’t store card numbers; write something like “Ziraat card”.'
    }
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)

    const fields = {
      name,
      url: url || null,
      login: formText(form, 'login') || null,
      purpose: formText(form, 'purpose'),
      status,
      cost: paid ? cost : null,
      currency,
      cycle,
      renewsOn: paid ? formText(form, 'renewsOn') || null : null,
      payment: paid ? formText(form, 'payment') || null : null,
      secretIn: formText(form, 'secretIn') || null,
      notes: formText(form, 'notes'),
      walletId: logsItself ? formText(form, 'walletId') || null : null,
    }
    // A password typed into Hop would sit unencrypted in backups and on every device.
    if ([fields.login ?? '', fields.purpose, fields.notes].some(looksLikeSecret) && !await confirm({
      title: 'That looks like a password',
      body: 'Hop isn’t built to keep passwords: they would sit unencrypted in backups and on every device that opens Hop. Keep it in Bitwarden and write “Bitwarden” under “Password kept in”.',
      confirmLabel: 'Save anyway',
      cancelLabel: 'Go back and remove it',
    })) return

    const saved = account ? await actions.update(account, fields, `${name} updated`) : await actions.add(fields)
    if (saved) closeDialog(form)
  }

  async function remove(form: HTMLFormElement) {
    if (!account || !await confirm({ title: `Delete ${account.name}?`, body: 'It’s removed from your accounts. Hop never had its password, so nothing changes at the service itself.', confirmLabel: 'Delete', tone: 'danger' })) return
    if (await actions.remove(account)) closeDialog(form)
  }

  return (
    <Dialog
      desc="Which login it uses, what it’s for, and what it costs. Never its password or card number: those go in Bitwarden."
      foot={<>
        {account && <button className="btn btn-ghost btn-danger" onClick={(event) => void remove(event.currentTarget.form!)} type="button">Delete</button>}
        <span className="spacer" />
        <button className="btn" data-close type="button">Cancel</button>
        <SubmitButton>{account ? 'Save' : 'Add'}</SubmitButton>
      </>}
      onClose={close}
      onSubmit={submit}
      title={account ? account.name : 'Add an account or subscription'}
    >
      <div className="form-grid">
        <div className="form-row">
          <Field defaultValue={account?.name} error={errors.name} label="Service" name="name" placeholder="e.g. Spotify, GitHub, Turkcell" required />
          <Field defaultValue={account?.login} error={errors.login} hint="Which email or username it uses." label="Login" name="login" optional placeholder="you@example.com" />
        </div>
        <Field defaultValue={account?.purpose} error={errors.purpose} label="What it’s for" name="purpose" optional placeholder="e.g. Music on the commute" />
        <Field defaultValue={account?.url} error={errors.url} label="Link to sign in or manage it" name="url" optional placeholder="https://" type="url" />
        <Segmented label="Status" name="status" onChange={(value) => setStatus(value as AccountStatus)} options={STATUS_OPTIONS} value={status} />
        <Field defaultValue={cycle} id="ac-cycle" label="Billing" name="cycle" onChange={(value) => setCycle(value as BillingCycle)} options={BILLING_CYCLE_OPTIONS} type="select" />
        {paid && (
          <>
            <div className="form-row">
              <Field defaultValue={account?.cost} error={errors.cost} label="Cost" name="cost" optional placeholder="59.99" />
              <Field defaultValue={currency} label="Currency" name="currency" onChange={(value) => setCurrency(value as Currency)} options={CURRENCY_OPTIONS} type="select" />
              <Field defaultValue={account?.renewsOn} error={errors.renewsOn} hint={status === 'trial' ? 'When the trial ends and the charging starts.' : 'Any renewal date you know; Hop works out the next ones.'} label={status === 'trial' ? 'Trial ends' : 'Renews on'} name="renewsOn" optional={status !== 'trial'} type="date" />
            </div>
            <Field defaultValue={account?.payment} error={errors.payment} hint="A name for the card or account, never its number." label="Paid with" name="payment" optional placeholder="e.g. Ziraat card" />
            {logsItself && (
              <Field
                defaultValue={account?.walletId ?? ''}
                hint={wallets.length ? 'On each renewal day Hop logs the charge in that wallet, marked “Logged automatically”.' : `You have no wallet in ${currency} in Finances yet.`}
                id="ac-wallet"
                key={currency}
                label="Log it in Finances"
                name="walletId"
                options={[['', 'No, I’ll tap Paid myself'], ...wallets.map(([id, name]): [string, string] => [id, `From ${name}`])]}
                type="select"
              />
            )}
          </>
        )}
        <Field defaultValue={account?.secretIn ?? 'Bitwarden'} label="Password kept in" name="secretIn" optional />
        <Field defaultValue={account?.notes} error={errors.notes} hint="No passwords or card numbers." label="Notes" name="notes" optional rows={2} type="textarea" />
      </div>
    </Dialog>
  )
}
