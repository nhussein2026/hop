// Money dialogs: logging spending in two taps, editing an entry, wallets and transfers, income,
// fixed costs, budgets, wishes and savings, and the month's dollar and euro rates.
import { useState } from 'react'
import { CARD_NUMBER, CURRENCIES, RATE_CURRENCIES, WISH_WAIT_DAYS } from '@hop/domain'
import * as D from '../lib/dates.ts'
import { POT_PRIORITY_LABEL, WALLET_KIND_LABEL } from '../lib/labels.ts'
import { SYMBOL, canBuy, defaultWallet, formatMoney, monthOf, monthSummary, parseAmount, potSaved, rateFor, walletBalance } from '../lib/money.ts'
import type { FixedCost } from '../lib/money.ts'
import type { Bill, Currency, IncomeSource, MoneyEntry, Pot, PotKind, PotPriority, Wallet, WalletKind } from '../lib/types.ts'
import { useMoneyActions } from '../store/money-actions.ts'
import type { BudgetLine } from '../store/money-actions.ts'
import { useHop } from '../store/store.ts'
import { Icon } from '../components/Icon.tsx'
import { Dialog, Field, FieldError, Segmented, SubmitButton } from '../components/ui.tsx'
import { useConfirm } from '../components/confirm.tsx'
import { closeDialog, focusFirstInvalid, formText } from '../components/ui-context.ts'

type Errors = Record<string, string>

const CURRENCY_OPTIONS = CURRENCIES.map((c): [string, string] => [c, c])
const CARD_HINT = 'That looks like a card or account number. Hop doesn’t store those; write a label like “Ziraat card”.'

const openWallets = (wallets: Wallet[]) => wallets.filter((w) => !w.archived).sort((a, b) => a.position - b.position)
const walletOptions = (wallets: Wallet[]) => openWallets(wallets).map((w): [string, string] => [w.id, `${w.name} (${w.currency})`])

/** An amount box with its currency in front. */
function AmountField({ id, name, label, currency, defaultValue, error, hint, large, optional, onChange }: {
  id: string; name: string; label: string; currency: Currency; defaultValue?: number | null; error?: string; hint?: string; large?: boolean; optional?: boolean; onChange?: (value: string) => void
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}{optional && <> <span className="optional">(optional)</span></>}</label>
      <div className={`amount-input${large ? ' amount-input-lg' : ''}`}>
        <span aria-hidden="true" className="amount-symbol">{SYMBOL[currency]}</span>
        <input aria-describedby={hint ? `${id}-hint` : undefined} aria-errormessage={error ? `${id}-err` : undefined} aria-invalid={error ? true : undefined} autoComplete="off" className={`input num${large ? ' input-lg' : ''}`} defaultValue={defaultValue ?? ''} id={id} inputMode="decimal" name={name} onChange={onChange ? (event) => onChange(event.target.value) : undefined} placeholder="0" />
      </div>
      {hint && <span className="field-hint" id={`${id}-hint`}>{hint}</span>}
      <FieldError error={error} id={`${id}-err`} />
    </div>
  )
}

/** Reads a positive amount from a form, or records why not. */
function readAmount(form: HTMLFormElement, name: string, errors: Errors, message = 'Type an amount, like 85 or 59.99.') {
  const text = formText(form, name)
  const amount = parseAmount(text)
  if (amount === null || amount <= 0) errors[name] = message
  return amount ?? 0
}

function NoWallet({ close }: { close: () => void }) {
  const actions = useMoneyActions()
  return (
    <Dialog foot={<><button className="btn" data-close type="button">Cancel</button><button className="btn btn-primary" onClick={() => void actions.setup()} type="button">Set up Finances</button></>} onClose={close} title="Set up Finances first">
      <p className="muted">Setting up adds a Cash wallet and starter categories like Groceries and Transport. You can rename or change them any time.</p>
    </Dialog>
  )
}

/* ---- Log spending: the amount, then one tap on what it was for ------------------------------ */
export function LogSpending({ close }: { close: () => void }) {
  const { data } = useHop()
  const actions = useMoneyActions()
  const wallets = openWallets(data.wallets)
  const [walletId, setWalletId] = useState(defaultWallet(data.wallets)?.id ?? '')
  const [error, setError] = useState('')
  const today = D.today()
  if (!wallets.length) return <NoWallet close={close} />
  const wallet = wallets.find((w) => w.id === walletId) ?? wallets[0]!
  const categories = data.spendCategories.filter((c) => !c.archived).sort((a, b) => a.position - b.position)
  const summary = monthSummary(data, monthOf(today), today)

  async function submit(form: HTMLFormElement, submitter: HTMLButtonElement | null) {
    const amount = parseAmount(formText(form, 'amount'))
    if (amount === null || amount <= 0) {
      setError('Type how much it cost first, like 85 or 59.99.')
      return focusFirstInvalid(form)
    }
    setError('')
    const categoryId = submitter?.dataset.category || null
    const category = categories.find((c) => c.id === categoryId)
    const date = formText(form, 'date') || today
    const line = summary.byCategory.find((c) => c.id === categoryId)
    let label = `${formatMoney(amount, wallet.currency)} logged${category ? ` for ${category.name}` : ''}`
    if (line?.budget && wallet.currency === 'TRY' && monthOf(date) === summary.month) {
      const left = line.budget - line.spent - amount
      label += left >= 0 ? `. ${formatMoney(left)} left there this month.` : `. That’s ${formatMoney(-left)} over its budget.`
    }
    const saved = await actions.entries.add({ date, kind: 'expense', amount, walletId: wallet.id, categoryId, note: formText(form, 'note') }, label)
    if (saved) closeDialog(form)
  }

  // Enter anywhere moves to the category buttons instead of saving under the first one.
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== 'Enter' || (event.target as HTMLElement).tagName === 'BUTTON') return
    event.preventDefault()
    event.currentTarget.querySelector<HTMLButtonElement>('.spend-cat')?.focus()
  }

  return (
    <Dialog className="log-spending" foot={false} initialFocus="#ls-amount" onClose={close} onSubmit={submit} title="Log spending">
      <div className="form-grid" onKeyDown={onKeyDown}>
        <AmountField currency={wallet.currency} error={error} id="ls-amount" label="How much" large name="amount" />
        <Field label="What was it" name="note" optional placeholder="e.g. Simit and tea" />
        <div className="form-row">
          <Field defaultValue={wallet.id} id="ls-wallet" label="Paid from" name="walletId" onChange={setWalletId} options={walletOptions(data.wallets)} type="select" />
          <Field defaultValue={today} id="ls-date" label="Day" name="date" type="date" />
        </div>
        <fieldset className="field">
          <legend className="field-label">What it was for <span className="optional">(tap one to save)</span></legend>
          <div className="spend-cats">
            {categories.map((c) => {
              const line = summary.byCategory.find((x) => x.id === c.id)
              const left = line?.budget ? line.budget - line.spent : null
              return (
                <button className="spend-cat" data-category={c.id} key={c.id} type="submit">
                  <span>{c.name}</span>
                  {left !== null && <span className={`xs num ${left < 0 ? 'is-danger' : 'muted'}`}>{left < 0 ? `${formatMoney(-left)} over` : `${formatMoney(left)} left`}</span>}
                </button>
              )
            })}
            {!categories.length && <button className="spend-cat" type="submit"><span>Save</span></button>}
          </div>
        </fieldset>
      </div>
    </Dialog>
  )
}

/* ---- One entry ---------------------------------------------------------------------------- */
const KIND_TITLE: Record<MoneyEntry['kind'], string> = { expense: 'Spending', income: 'Income', transfer: 'Transfer', adjust: 'Adjustment' }

export function EntryEditor({ entry: e, close }: { entry: MoneyEntry; close: () => void }) {
  const { data } = useHop()
  const actions = useMoneyActions()
  const confirm = useConfirm()
  const [errors, setErrors] = useState<Errors>({})
  const [walletId, setWalletId] = useState(e.walletId)
  const [toWalletId, setToWalletId] = useState(e.toWalletId ?? '')
  const wallet = data.wallets.find((w) => w.id === walletId)
  const toWallet = data.wallets.find((w) => w.id === toWalletId)
  // The entry's own wallets stay listed even when archived.
  const options = data.wallets.filter((w) => !w.archived || w.id === e.walletId || w.id === e.toWalletId).map((w): [string, string] => [w.id, `${w.name} (${w.currency})`])
  const categories: [string, string][] = [['', 'No category'], ...data.spendCategories.filter((c) => !c.archived || c.id === e.categoryId).map((c): [string, string] => [c.id, c.name])]
  const sources: [string, string][] = [['', 'Other income'], ...data.incomeSources.map((s): [string, string] => [s.id, s.name])]
  const pays = e.billId ? data.bills.find((b) => b.id === e.billId)?.name : e.accountId ? data.accounts.find((a) => a.id === e.accountId)?.name : e.potId ? data.pots.find((p) => p.id === e.potId)?.name : null

  async function submit(form: HTMLFormElement) {
    const next: Errors = {}
    const amountText = formText(form, 'amount')
    const amount = parseAmount(amountText) ?? 0
    if (e.kind === 'adjust' ? !amount : amount <= 0) next.amount = e.kind === 'adjust' ? 'Type the difference, like 50 or -50.' : 'Type an amount, like 85 or 59.99.'
    const crossing = e.kind === 'transfer' && wallet && toWallet && wallet.currency !== toWallet.currency
    const toAmount = crossing ? readAmount(form, 'toAmount', next, 'Say how much arrived.') : null
    if (e.kind === 'transfer' && (!toWalletId || toWalletId === walletId)) next.toWalletId = 'Pick another wallet to move it to.'
    if (CARD_NUMBER.test(formText(form, 'note'))) next.note = CARD_HINT
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const changes = {
      amount, walletId, date: formText(form, 'date'), note: formText(form, 'note'),
      ...(e.kind === 'expense' ? { categoryId: formText(form, 'categoryId') || null } : {}),
      ...(e.kind === 'income' ? { incomeId: formText(form, 'incomeId') || null } : {}),
      ...(e.kind === 'transfer' ? { toWalletId, toAmount } : {}),
    }
    if (await actions.entries.update(e, changes)) closeDialog(form)
  }

  async function remove(form: HTMLFormElement) {
    if (!await confirm({ title: 'Delete this entry?', body: 'Its wallet’s balance and the month’s numbers change back. You can undo right after.', confirmLabel: 'Delete', tone: 'danger' })) return
    if (await actions.entries.remove(e)) closeDialog(form)
  }

  return (
    <Dialog
      desc={pays ? `Pays ${pays}.` : undefined}
      foot={<><button className="btn btn-ghost btn-danger" onClick={(event) => void remove(event.currentTarget.form!)} type="button">Delete</button><span className="spacer" /><button className="btn" data-close type="button">Cancel</button><SubmitButton>Save</SubmitButton></>}
      onClose={close}
      onSubmit={submit}
      title={KIND_TITLE[e.kind]}
    >
      <div className="form-grid">
        <div className="form-row">
          {e.kind === 'adjust'
            ? <Field defaultValue={e.amount} error={errors.amount} hint="Plus adds to the wallet, minus takes off." label="Difference" name="amount" />
            : <AmountField currency={wallet?.currency ?? e.currency} defaultValue={e.amount} error={errors.amount} id="en-amount" label={e.kind === 'transfer' ? 'Moved' : 'Amount'} name="amount" />}
          <Field defaultValue={e.date} label="Day" name="date" type="date" />
        </div>
        {e.kind !== 'adjust' && <Field defaultValue={e.walletId} id="en-wallet" label={e.kind === 'income' ? 'Into' : 'From'} name="walletId" onChange={setWalletId} options={options} type="select" />}
        {e.kind === 'transfer' && (
          <div className="form-row">
            <Field defaultValue={e.toWalletId ?? ''} error={errors.toWalletId} id="en-to" label="To" name="toWalletId" onChange={setToWalletId} options={[['', 'Pick a wallet'], ...options]} type="select" />
            {wallet && toWallet && wallet.currency !== toWallet.currency && <AmountField currency={toWallet.currency} defaultValue={e.toAmount} error={errors.toAmount} id="en-toamount" label="Arrived as" name="toAmount" />}
          </div>
        )}
        {e.kind === 'expense' && <Field defaultValue={e.categoryId ?? ''} id="en-cat" label="Category" name="categoryId" options={categories} type="select" />}
        {e.kind === 'income' && <Field defaultValue={e.incomeId ?? ''} id="en-src" label="From" name="incomeId" options={sources} type="select" />}
        <Field defaultValue={e.note} error={errors.note} label="Note" name="note" optional />
      </div>
    </Dialog>
  )
}

/* ---- Wallets ------------------------------------------------------------------------------ */
export function WalletEditor({ wallet: w, close }: { wallet?: Wallet | null; close: () => void }) {
  const { data } = useHop()
  const actions = useMoneyActions()
  const confirm = useConfirm()
  const [errors, setErrors] = useState<Errors>({})
  const [currency, setCurrency] = useState<Currency>(w?.currency ?? 'TRY')
  const used = w ? data.moneyEntries.some((e) => e.walletId === w.id || e.toWalletId === w.id) : false

  async function submit(form: HTMLFormElement) {
    const name = formText(form, 'name')
    const opening = parseAmount(formText(form, 'openingBalance') || '0')
    const next: Errors = {}
    if (!name) next.name = 'Name the wallet, like Cash or Ziraat.'
    else if (CARD_NUMBER.test(name)) next.name = CARD_HINT
    if (opening === null) next.openingBalance = 'Use a number, like 1500.'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const fields = { name, kind: (formText(form, 'kind') || 'cash') as WalletKind, openingBalance: opening ?? 0, openedOn: formText(form, 'openedOn') || D.today() }
    const saved = w ? await actions.wallets.update(w, fields, `${name} updated`) : await actions.wallets.add({ ...fields, currency })
    if (saved) closeDialog(form)
  }

  async function remove(form: HTMLFormElement) {
    if (!w) return
    if (used) {
      if (await actions.wallets.update(w, { archived: !w.archived }, w.archived ? `${w.name} is open again` : `${w.name} archived. Past months still count it.`, true)) closeDialog(form)
      return
    }
    if (!await confirm({ title: `Delete ${w.name}?`, body: 'Nothing was logged in it yet, so nothing else changes.', confirmLabel: 'Delete', tone: 'danger' })) return
    if (await actions.wallets.remove(w)) closeDialog(form)
  }

  return (
    <Dialog
      desc="Cash, a bank account, a card or an app. Only a name for it, never its number."
      foot={<>
        {w && <button className="btn btn-ghost btn-danger" onClick={(event) => void remove(event.currentTarget.form!)} type="button">{used ? (w.archived ? 'Open again' : 'Archive') : 'Delete'}</button>}
        <span className="spacer" />
        <button className="btn" data-close type="button">Cancel</button>
        <SubmitButton>{w ? 'Save' : 'Add wallet'}</SubmitButton>
      </>}
      onClose={close}
      onSubmit={submit}
      title={w ? w.name : 'Add a wallet'}
    >
      <div className="form-grid">
        <Field defaultValue={w?.name} error={errors.name} label="Name" name="name" placeholder="e.g. Ziraat, Cash, Papara" required />
        <Segmented defaultValue={w?.kind ?? 'bank'} label="Kind" name="kind" options={Object.entries(WALLET_KIND_LABEL).map(([value, [label]]) => [value, label])} />
        <div className="form-row">
          {w
            ? <Field defaultValue={w.currency} hint="Fixed: its entries are in it." label="Currency" name="currencyShown" readOnly />
            : <Field defaultValue={currency} id="wa-currency" label="Currency" name="currency" onChange={(value) => setCurrency(value as Currency)} options={CURRENCY_OPTIONS} type="select" />}
          <Field defaultValue={w?.openedOn ?? D.today()} label="Balance on" name="openedOn" type="date" />
        </div>
        <AmountField currency={w?.currency ?? currency} defaultValue={w?.openingBalance ?? null} error={errors.openingBalance} hint="What it held that day. Entries from then on add up from here." id="wa-opening" label="It held" name="openingBalance" />
      </div>
    </Dialog>
  )
}

export function TransferEditor({ from, close }: { from?: Wallet; close: () => void }) {
  const { data } = useHop()
  const actions = useMoneyActions()
  const wallets = openWallets(data.wallets)
  const [fromId, setFromId] = useState(from?.id ?? wallets[0]?.id ?? '')
  const [toId, setToId] = useState(wallets.find((w) => w.id !== fromId)?.id ?? '')
  const [errors, setErrors] = useState<Errors>({})
  const source = wallets.find((w) => w.id === fromId)
  const target = wallets.find((w) => w.id === toId)
  const crossing = source && target && source.currency !== target.currency

  async function submit(form: HTMLFormElement) {
    const next: Errors = {}
    const amount = readAmount(form, 'amount', next)
    const toAmount = crossing ? readAmount(form, 'toAmount', next, `Say how many ${target!.currency} arrived.`) : null
    if (!toId || toId === fromId) next.toWalletId = 'Pick another wallet to move it to.'
    setErrors(next)
    if (Object.keys(next).length || !source || !target) return focusFirstInvalid(form)
    const saved = await actions.entries.add({ date: formText(form, 'date') || D.today(), kind: 'transfer', amount, walletId: source.id, toWalletId: target.id, toAmount, note: formText(form, 'note') }, `${formatMoney(amount, source.currency)} moved from ${source.name} to ${target.name}`)
    if (saved) closeDialog(form)
  }

  if (wallets.length < 2) {
    return (
      <Dialog foot={<button className="btn" data-close type="button">Close</button>} onClose={close} title="Move money">
        <p className="muted">Moving money needs two wallets. Add another one first, like your bank account or a card.</p>
      </Dialog>
    )
  }
  const options = walletOptions(data.wallets)
  return (
    <Dialog desc="Cash taken out, a card paid off, dollars changed to lira. It isn’t spending, so budgets don’t change." foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Move</SubmitButton></>} onClose={close} onSubmit={submit} title="Move money">
      <div className="form-grid">
        <div className="form-row">
          <Field defaultValue={fromId} id="tr-from" label="From" name="walletId" onChange={setFromId} options={options} type="select" />
          <Field defaultValue={toId} error={errors.toWalletId} id="tr-to" label="To" name="toWalletId" onChange={setToId} options={options} type="select" />
        </div>
        <div className="form-row">
          <AmountField currency={source?.currency ?? 'TRY'} error={errors.amount} id="tr-amount" label="Amount" name="amount" />
          {crossing && <AmountField currency={target.currency} error={errors.toAmount} hint="What it came to after changing." id="tr-toamount" label="Arrived as" name="toAmount" />}
        </div>
        <div className="form-row">
          <Field defaultValue={D.today()} label="Day" name="date" type="date" />
          <Field label="Note" name="note" optional />
        </div>
      </div>
    </Dialog>
  )
}

/** Make Hop's balance match what the wallet really holds. */
export function MatchBalance({ wallet: w, close }: { wallet: Wallet; close: () => void }) {
  const { data } = useHop()
  const actions = useMoneyActions()
  const [error, setError] = useState('')
  const balance = walletBalance(w, data.moneyEntries)

  async function submit(form: HTMLFormElement) {
    const real = parseAmount(formText(form, 'real'))
    if (real === null) {
      setError('Type what it holds, like 1250.')
      return focusFirstInvalid(form)
    }
    const difference = Math.round((real - balance) * 100) / 100
    if (difference === 0) return closeDialog(form)
    if (await actions.wallets.match(w, difference)) closeDialog(form)
  }

  return (
    <Dialog className="dialog-sm" desc={`Hop counts ${formatMoney(balance, w.currency)} in ${w.name}. If the real number is different, something wasn’t logged; Hop adds one adjustment for the difference.`} foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Match</SubmitButton></>} onClose={close} onSubmit={submit} title={`Match ${w.name}`}>
      <AmountField currency={w.currency} error={error} id="mb-real" label="It really holds" large name="real" />
    </Dialog>
  )
}

/* ---- Income -------------------------------------------------------------------------------- */
export function IncomeEditor({ source: s, close }: { source?: IncomeSource | null; close: () => void }) {
  const { data } = useHop()
  const actions = useMoneyActions()
  const confirm = useConfirm()
  const [errors, setErrors] = useState<Errors>({})
  const [currency, setCurrency] = useState<Currency>(s?.currency ?? 'TRY')
  const received = s ? data.moneyEntries.some((e) => e.incomeId === s.id) : false

  async function submit(form: HTMLFormElement) {
    const next: Errors = {}
    const name = formText(form, 'name')
    if (!name) next.name = 'Name it, like Salary.'
    else if (CARD_NUMBER.test(name)) next.name = CARD_HINT
    const amount = readAmount(form, 'amount', next, 'Type what usually arrives, like 24900.')
    const dayText = formText(form, 'payDay')
    const payDay = dayText ? Number(dayText) : null
    if (payDay !== null && !(Number.isInteger(payDay) && payDay >= 1 && payDay <= 31)) next.payDay = 'Use a day from 1 to 31.'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const fields = { name, amount, currency, payDay, walletId: formText(form, 'walletId') || null }
    const saved = s ? await actions.income.update(s, fields, `${name} updated`) : await actions.income.add(fields)
    if (saved) closeDialog(form)
  }

  async function remove(form: HTMLFormElement) {
    if (!s) return
    if (received) {
      if (await actions.income.update(s, { active: !s.active }, s.active ? `${s.name} paused` : `${s.name} is back on`)) closeDialog(form)
      return
    }
    if (!await confirm({ title: `Delete ${s.name}?`, body: 'It’s no longer expected each month.', confirmLabel: 'Delete', tone: 'danger' })) return
    if (await actions.income.remove(s)) closeDialog(form)
  }

  return (
    <Dialog
      desc="Money that arrives each month, like a salary. Hop expects it until you mark it received."
      foot={<>
        {s && <button className="btn btn-ghost btn-danger" onClick={(event) => void remove(event.currentTarget.form!)} type="button">{received ? (s.active ? 'Pause' : 'Turn back on') : 'Delete'}</button>}
        <span className="spacer" />
        <button className="btn" data-close type="button">Cancel</button>
        <SubmitButton>{s ? 'Save' : 'Add income'}</SubmitButton>
      </>}
      onClose={close}
      onSubmit={submit}
      title={s ? s.name : 'Add monthly income'}
    >
      <div className="form-grid">
        <Field defaultValue={s?.name} error={errors.name} label="Name" name="name" placeholder="e.g. Salary" required />
        <div className="form-row">
          <AmountField currency={currency} defaultValue={s?.amount ?? null} error={errors.amount} id="in-amount" label="Usually" name="amount" />
          <Field defaultValue={currency} id="in-currency" label="Currency" name="currency" onChange={(value) => setCurrency(value as Currency)} options={CURRENCY_OPTIONS} type="select" />
        </div>
        <div className="form-row">
          <Field defaultValue={s?.payDay} error={errors.payDay} label="Arrives on day" max={31} min={1} name="payDay" optional placeholder="e.g. 1" type="number" />
          <Field defaultValue={s?.walletId ?? ''} id="in-wallet" label="Arrives in" name="walletId" options={[['', 'Any wallet'], ...walletOptions(data.wallets)]} type="select" />
        </div>
      </div>
    </Dialog>
  )
}

export function ReceiveIncome({ source: s, close }: { source?: IncomeSource | null; close: () => void }) {
  const { data } = useHop()
  const actions = useMoneyActions()
  const wallets = openWallets(data.wallets)
  const preferred = (s?.walletId && wallets.find((w) => w.id === s.walletId)) || defaultWallet(data.wallets, s?.currency) || defaultWallet(data.wallets)
  const [walletId, setWalletId] = useState(preferred?.id ?? '')
  const [errors, setErrors] = useState<Errors>({})
  if (!wallets.length) return <NoWallet close={close} />
  const wallet = wallets.find((w) => w.id === walletId) ?? wallets[0]!
  const same = !s || s.currency === wallet.currency

  async function submit(form: HTMLFormElement) {
    const next: Errors = {}
    const amount = readAmount(form, 'amount', next)
    if (CARD_NUMBER.test(formText(form, 'note'))) next.note = CARD_HINT
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    if (await actions.income.receive(s ?? null, { amount, walletId: wallet.id, date: formText(form, 'date') || D.today(), note: formText(form, 'note') }, wallet)) closeDialog(form)
  }

  return (
    <Dialog foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Received</SubmitButton></>} onClose={close} onSubmit={submit} title={s ? `${s.name} received` : 'Money received'}>
      <div className="form-grid">
        <div className="form-row">
          <AmountField currency={wallet.currency} defaultValue={same && s ? s.amount : null} error={errors.amount} hint={s && !same ? `Usually ${formatMoney(s.amount, s.currency)}: type what arrived in ${wallet.currency}.` : undefined} id="ri-amount" key={wallet.currency} label="Amount" large name="amount" />
          <Field defaultValue={wallet.id} id="ri-wallet" label="Into" name="walletId" onChange={setWalletId} options={walletOptions(data.wallets)} type="select" />
        </div>
        <div className="form-row">
          <Field defaultValue={D.today()} label="Day" name="date" type="date" />
          <Field error={errors.note} label="Note" name="note" optional placeholder={s ? undefined : 'e.g. Freelance job'} />
        </div>
      </div>
    </Dialog>
  )
}

/* ---- Fixed costs ----------------------------------------------------------------------------- */
export function BillEditor({ bill: b, close }: { bill?: Bill | null; close: () => void }) {
  const { data } = useHop()
  const actions = useMoneyActions()
  const confirm = useConfirm()
  const [errors, setErrors] = useState<Errors>({})
  const [currency, setCurrency] = useState<Currency>(b?.currency ?? 'TRY')
  const paid = b ? data.moneyEntries.some((e) => e.billId === b.id) : false
  const categories: [string, string][] = [['', 'No category'], ...data.spendCategories.filter((c) => !c.archived || c.id === b?.categoryId).map((c): [string, string] => [c.id, c.name])]

  async function submit(form: HTMLFormElement) {
    const next: Errors = {}
    const name = formText(form, 'name')
    if (!name) next.name = 'Name it, like Rent.'
    else if (CARD_NUMBER.test(name)) next.name = CARD_HINT
    const amount = readAmount(form, 'amount', next, 'Type what it costs each month.')
    const dueDay = Number(formText(form, 'dueDay'))
    if (!(Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31)) next.dueDay = 'Use a day from 1 to 31.'
    if (CARD_NUMBER.test(formText(form, 'notes'))) next.notes = CARD_HINT
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const fields = { name, amount, currency, dueDay, categoryId: formText(form, 'categoryId') || null, walletId: formText(form, 'walletId') || null, notes: formText(form, 'notes') }
    const saved = b ? await actions.bills.update(b, fields, `${name} updated`) : await actions.bills.add(fields)
    if (saved) closeDialog(form)
  }

  async function remove(form: HTMLFormElement) {
    if (!b) return
    if (paid) {
      if (await actions.bills.update(b, { active: !b.active }, b.active ? `${b.name} paused. Past months keep it.` : `${b.name} is back on`)) closeDialog(form)
      return
    }
    if (!await confirm({ title: `Delete ${b.name}?`, body: 'It’s no longer planned each month.', confirmLabel: 'Delete', tone: 'danger' })) return
    if (await actions.bills.remove(b)) closeDialog(form)
  }

  return (
    <Dialog
      desc="Something you pay every month, like rent, the phone or a transport card. Subscriptions in Accounts count by themselves."
      foot={<>
        {b && <button className="btn btn-ghost btn-danger" onClick={(event) => void remove(event.currentTarget.form!)} type="button">{paid ? (b.active ? 'Pause' : 'Turn back on') : 'Delete'}</button>}
        <span className="spacer" />
        <button className="btn" data-close type="button">Cancel</button>
        <SubmitButton>{b ? 'Save' : 'Add fixed cost'}</SubmitButton>
      </>}
      onClose={close}
      onSubmit={submit}
      title={b ? b.name : 'Add a fixed cost'}
    >
      <div className="form-grid">
        <Field defaultValue={b?.name} error={errors.name} label="Name" name="name" placeholder="e.g. Rent" required />
        <div className="form-row">
          <AmountField currency={currency} defaultValue={b?.amount ?? null} error={errors.amount} id="bi-amount" label="Each month" name="amount" />
          <Field defaultValue={currency} id="bi-currency" label="Currency" name="currency" onChange={(value) => setCurrency(value as Currency)} options={CURRENCY_OPTIONS} type="select" />
          <Field defaultValue={b?.dueDay} error={errors.dueDay} hint="31 means the month’s last day." label="Due on day" max={31} min={1} name="dueDay" placeholder="1" type="number" />
        </div>
        <div className="form-row">
          <Field defaultValue={b?.walletId ?? ''} id="bi-wallet" label="Usually paid from" name="walletId" options={[['', 'Ask each time'], ...walletOptions(data.wallets)]} type="select" />
          <Field defaultValue={b?.categoryId ?? ''} id="bi-cat" label="Category" name="categoryId" optional options={categories} type="select" />
        </div>
        <Field defaultValue={b?.notes} error={errors.notes} label="Notes" name="notes" optional placeholder="e.g. Landlord’s IBAN is in the contract" rows={2} type="textarea" />
      </div>
    </Dialog>
  )
}

export function PayCost({ cost, close }: { cost: FixedCost; close: () => void }) {
  const { data } = useHop()
  const actions = useMoneyActions()
  const wallets = openWallets(data.wallets)
  const preferred = (cost.bill?.walletId && wallets.find((w) => w.id === cost.bill!.walletId)) || defaultWallet(data.wallets, cost.currency) || defaultWallet(data.wallets)
  const [walletId, setWalletId] = useState(preferred?.id ?? '')
  const [errors, setErrors] = useState<Errors>({})
  if (!wallets.length) return <NoWallet close={close} />
  const wallet = wallets.find((w) => w.id === walletId) ?? wallets[0]!
  const same = wallet.currency === cost.currency

  async function submit(form: HTMLFormElement) {
    const next: Errors = {}
    const amount = readAmount(form, 'amount', next)
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    if (await actions.bills.pay(cost, { amount, walletId: wallet.id, date: formText(form, 'date') || D.today() }, wallet)) closeDialog(form)
  }

  return (
    <Dialog className="dialog-sm" desc={`Due ${D.inSentence(cost.due)}: ${formatMoney(cost.amount, cost.currency)}.`} foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Paid</SubmitButton></>} onClose={close} onSubmit={submit} title={`Pay ${cost.name}`}>
      <div className="form-grid">
        <AmountField currency={wallet.currency} defaultValue={same ? cost.amount : null} error={errors.amount} hint={same ? undefined : `Type what it came to in ${wallet.currency}.`} id="pc-amount" key={wallet.currency} label="Paid" name="amount" />
        <div className="form-row">
          <Field defaultValue={wallet.id} id="pc-wallet" label="From" name="walletId" onChange={setWalletId} options={walletOptions(data.wallets)} type="select" />
          <Field defaultValue={D.today()} label="Day" name="date" type="date" />
        </div>
      </div>
    </Dialog>
  )
}

/* ---- Budgets ----------------------------------------------------------------------------------- */
export function BudgetsEditor({ close }: { close: () => void }) {
  const { data } = useHop()
  const actions = useMoneyActions()
  const today = D.today()
  const summary = monthSummary(data, monthOf(today), today)
  const [lines, setLines] = useState<(BudgetLine & { key: string; text: string })[]>(() => data.spendCategories
    .filter((c) => !c.archived).sort((a, b) => a.position - b.position)
    .map((c) => ({ key: c.id, id: c.id, name: c.name, monthlyBudget: c.monthlyBudget, remove: false, text: c.monthlyBudget === null ? '' : String(c.monthlyBudget) })))
  const [error, setError] = useState('')
  const kept = lines.filter((l) => !l.remove)
  const total = kept.reduce((sum, l) => sum + (parseAmount(l.text) ?? 0), 0)
  const unplanned = summary.unplanned + summary.budget - total
  const change = (key: string, patch: Partial<BudgetLine & { text: string }>) => setLines((list) => list.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  async function submit(form: HTMLFormElement) {
    const bad = kept.find((l) => (l.text && (parseAmount(l.text) ?? -1) < 0) || (!l.name.trim() && (l.id || l.text)))
    if (bad) {
      setError(!bad.name.trim() ? 'Every category needs a name.' : `The budget for ${bad.name} isn’t a number.`)
      return focusFirstInvalid(form)
    }
    setError('')
    const saved = await actions.categories.save(lines.map((l) => ({ id: l.id, name: l.name.trim(), monthlyBudget: l.text ? parseAmount(l.text) : null, remove: l.remove })), data)
    if (saved) closeDialog(form)
  }

  return (
    <Dialog
      desc="What you plan to spend each month on everyday things, in lira. Leave a budget empty to only track it."
      foot={<><span className="small num muted">Total {formatMoney(total)} · Not planned {formatMoney(unplanned)}</span><span className="spacer" /><button className="btn" data-close type="button">Cancel</button><SubmitButton>Save</SubmitButton></>}
      onClose={close}
      onSubmit={submit}
      title="Budgets"
    >
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="budget-lines">
        {kept.map((l) => (
          <div className="budget-line" key={l.key}>
            <label className="visually-hidden" htmlFor={`bl-name-${l.key}`}>Category</label>
            <input className="input" id={`bl-name-${l.key}`} maxLength={60} onChange={(event) => change(l.key, { name: event.target.value })} placeholder="Category" value={l.name} />
            <label className="visually-hidden" htmlFor={`bl-amount-${l.key}`}>{`Budget for ${l.name || 'this category'}`}</label>
            <div className="amount-input"><span aria-hidden="true" className="amount-symbol">₺</span><input className="input num" id={`bl-amount-${l.key}`} inputMode="decimal" onChange={(event) => change(l.key, { text: event.target.value })} placeholder="No budget" value={l.text} /></div>
            <button aria-label={`Remove ${l.name || 'this line'}`} className="icon-btn" onClick={() => change(l.key, { remove: true })} type="button"><Icon name="trash" /></button>
          </div>
        ))}
      </div>
      <button className="btn btn-sm" onClick={() => setLines((list) => [...list, { key: `new-${list.length}`, id: null, name: '', monthlyBudget: null, remove: false, text: '' }])} type="button"><Icon className="icon-sm" name="plus" />Add a category</button>
      <p className="xs muted">Removing a category you’ve logged spending under archives it, so past months still add up.</p>
    </Dialog>
  )
}

/* ---- Wishes and savings ------------------------------------------------------------------------- */
const PRIORITY_OPTIONS = Object.entries(POT_PRIORITY_LABEL) as [PotPriority, string][]

export function PotEditor({ pot: p, kind: initialKind = 'wish', close }: { pot?: Pot | null; kind?: PotKind; close: () => void }) {
  const actions = useMoneyActions()
  const confirm = useConfirm()
  const [errors, setErrors] = useState<Errors>({})
  const [kind, setKind] = useState<PotKind>(p?.kind ?? initialKind)
  const [currency, setCurrency] = useState<Currency>(p?.currency ?? 'TRY')
  const wish = kind === 'wish'

  async function submit(form: HTMLFormElement) {
    const next: Errors = {}
    const name = formText(form, 'name')
    if (!name) next.name = wish ? 'Say what you want.' : 'Name it, like Emergency fund.'
    else if (CARD_NUMBER.test(name)) next.name = CARD_HINT
    const targetText = formText(form, 'target')
    const target = targetText ? parseAmount(targetText) : null
    if (targetText && (target === null || target < 0)) next.target = 'Use a number, like 2400.'
    const monthlyText = formText(form, 'monthly')
    const monthly = monthlyText ? parseAmount(monthlyText) : null
    if (monthlyText && (monthly === null || monthly < 0)) next.monthly = 'Use a number, like 500.'
    const url = formText(form, 'url')
    if (url && !/^https?:\/\/\S+\.\S+/.test(url)) next.url = 'Use a full link starting with https://'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const fields = { name, target, currency, monthly, priority: (formText(form, 'priority') || 'medium') as PotPriority, why: formText(form, 'why'), url: url || null }
    const waitUntil = formText(form, 'waitUntil')
    const saved = p ? await actions.pots.update(p, { ...fields, ...(p.kind === 'wish' && waitUntil ? { waitUntil } : {}) }, `${name} updated`) : await actions.pots.add({ ...fields, kind })
    if (saved) closeDialog(form)
  }

  async function remove(form: HTMLFormElement) {
    if (!p || !await confirm({ title: `Delete ${p.name}?`, body: p.status === 'bought' ? 'Its purchase stays in your spending history.' : 'What you put aside for it is free again. To keep it in your history, drop it instead.', confirmLabel: 'Delete', tone: 'danger' })) return
    if (await actions.pots.remove(p)) closeDialog(form)
  }

  return (
    <Dialog
      desc={wish ? `Something you’d like to buy. Hop holds it for ${WISH_WAIT_DAYS} days first: if you still want it then, it’s a real want.` : 'Money you keep aside on purpose, like an emergency fund. It stays in your wallets, but Hop counts it as spoken for.'}
      foot={<>
        {p && <button className="btn btn-ghost btn-danger" onClick={(event) => void remove(event.currentTarget.form!)} type="button">Delete</button>}
        <span className="spacer" />
        <button className="btn" data-close type="button">Cancel</button>
        <SubmitButton>{p ? 'Save' : wish ? 'Add to wish list' : 'Add saving'}</SubmitButton>
      </>}
      onClose={close}
      onSubmit={submit}
      title={p ? p.name : wish ? 'Add a wish' : 'Add a saving'}
    >
      <div className="form-grid">
        {!p && <Segmented label="It’s" name="kind" onChange={(value) => setKind(value as PotKind)} options={[['wish', 'Something to buy'], ['saving', 'A saving']]} value={kind} />}
        <Field defaultValue={p?.name} error={errors.name} label={wish ? 'What' : 'Name'} name="name" placeholder={wish ? 'e.g. Noise-cancelling headphones' : 'e.g. Emergency fund'} required />
        <div className="form-row">
          <AmountField currency={currency} defaultValue={p?.target ?? null} error={errors.target} id="po-target" label={wish ? 'Price' : 'Goal'} name="target" optional />
          <Field defaultValue={currency} id="po-currency" label="Currency" name="currency" onChange={(value) => setCurrency(value as Currency)} options={CURRENCY_OPTIONS} type="select" />
          <AmountField currency={currency} defaultValue={p?.monthly ?? null} error={errors.monthly} hint="Counts in each month’s plan." id="po-monthly" label="Put aside each month" name="monthly" optional />
        </div>
        {wish && (
          <>
            <Segmented defaultValue={p?.priority ?? 'medium'} label="How much you want it" name="priority" options={PRIORITY_OPTIONS} />
            <Field defaultValue={p?.why} label="Why you want it" name="why" optional placeholder="What it would change for you" rows={2} type="textarea" />
            <div className="form-row">
              <Field defaultValue={p?.url} error={errors.url} label="Link" name="url" optional placeholder="https://" type="url" />
              {p && <Field defaultValue={p.waitUntil} hint="The first day you can buy it." label="Wait until" name="waitUntil" type="date" />}
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}

export function PutAside({ pot: p, close }: { pot: Pot; close: () => void }) {
  const { data } = useHop()
  const actions = useMoneyActions()
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [error, setError] = useState('')
  const saved = potSaved(p, data.potMoves)

  async function submit(form: HTMLFormElement) {
    const errors: Errors = {}
    const amount = readAmount(form, 'amount', errors)
    if (!errors.amount && direction === 'out' && amount > saved) errors.amount = `Only ${formatMoney(saved, p.currency)} is set aside.`
    setError(errors.amount ?? '')
    if (errors.amount) return focusFirstInvalid(form)
    if (await actions.pots.move(p, direction === 'in' ? amount : -amount, formText(form, 'date') || D.today(), formText(form, 'note'))) closeDialog(form)
  }

  return (
    <Dialog className="dialog-sm" desc={`${formatMoney(saved, p.currency)} set aside${p.target ? ` of ${formatMoney(p.target, p.currency)}` : ''}. The money stays in your wallet; Hop counts it as spoken for.`} foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>{direction === 'in' ? 'Put aside' : 'Take back'}</SubmitButton></>} onClose={close} onSubmit={submit} title={p.name}>
      <div className="form-grid">
        {saved > 0 && <Segmented label="Do" name="direction" onChange={(value) => setDirection(value as 'in' | 'out')} options={[['in', 'Put aside'], ['out', 'Take back']]} small value={direction} />}
        <AmountField currency={p.currency} defaultValue={direction === 'in' ? p.monthly : null} error={error} id="pa-amount" key={direction} label="Amount" large name="amount" />
        <div className="form-row">
          <Field defaultValue={D.today()} label="Day" name="date" type="date" />
          <Field label="Note" name="note" optional />
        </div>
      </div>
    </Dialog>
  )
}

export function BuyWish({ pot: p, close }: { pot: Pot; close: () => void }) {
  const { data } = useHop()
  const actions = useMoneyActions()
  const wallets = openWallets(data.wallets)
  const [walletId, setWalletId] = useState((defaultWallet(data.wallets, p.currency) ?? defaultWallet(data.wallets))?.id ?? '')
  const [error, setError] = useState('')
  if (!wallets.length) return <NoWallet close={close} />
  const wallet = wallets.find((w) => w.id === walletId) ?? wallets[0]!
  const saved = potSaved(p, data.potMoves)

  async function submit(form: HTMLFormElement) {
    const errors: Errors = {}
    const amount = readAmount(form, 'amount', errors, 'Type what it cost.')
    setError(errors.amount ?? '')
    if (errors.amount) return focusFirstInvalid(form)
    if (await actions.pots.buy(p, { amount, walletId: wallet.id, date: formText(form, 'date') || D.today() })) closeDialog(form)
  }

  return (
    <Dialog className="dialog-sm" desc={saved ? `${formatMoney(saved, p.currency)} was set aside for it. Anything above that comes out of this month’s money.` : 'It isn’t everyday spending, so budgets don’t change; it comes out of this month’s money.'} foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Bought it</SubmitButton></>} onClose={close} onSubmit={submit} title={`Buy ${p.name}`}>
      {!canBuy(p, D.today()) && <p className="field-error">You set it to wait until {D.short(p.waitUntil!)}.</p>}
      <div className="form-grid">
        <AmountField currency={wallet.currency} defaultValue={wallet.currency === p.currency ? p.target : null} error={error} id="bw-amount" key={wallet.currency} label="It cost" name="amount" />
        <div className="form-row">
          <Field defaultValue={wallet.id} id="bw-wallet" label="Paid from" name="walletId" onChange={setWalletId} options={walletOptions(data.wallets)} type="select" />
          <Field defaultValue={D.today()} label="Day" name="date" type="date" />
        </div>
      </div>
    </Dialog>
  )
}

/* ---- Rates ---------------------------------------------------------------------------------------- */
export function RatesEditor({ month, close }: { month: string; close: () => void }) {
  const { data } = useHop()
  const actions = useMoneyActions()
  const [errors, setErrors] = useState<Errors>({})
  const own = (currency: string) => data.moneyRates.find((r) => r.month === month && r.currency === currency)

  async function submit(form: HTMLFormElement) {
    const next: Errors = {}
    const values = RATE_CURRENCIES.map((currency) => {
      const text = formText(form, currency)
      const rate = text ? parseAmount(text) : null
      if (text && (rate === null || rate <= 0)) next[currency] = 'Use a number, like 41.25.'
      return [currency, rate] as const
    })
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    for (const [currency, rate] of values) {
      const existing = own(currency)
      if (rate !== null && rate !== existing?.rate && !await actions.rates.set(month, currency, rate)) return
      if (rate === null && existing && !await actions.rates.remove(existing)) return
    }
    closeDialog(form)
  }

  return (
    <Dialog className="dialog-sm" desc="How many lira one dollar or euro was worth. Hop keeps using the last rate you set until you set a new one." foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Save</SubmitButton></>} onClose={close} onSubmit={submit} title={`Rates for ${D.monthLong(`${month}-01`)}`}>
      <div className="form-row">
        {RATE_CURRENCIES.map((currency) => {
          const fallback = rateFor(data.moneyRates, month, currency)
          return <Field defaultValue={own(currency)?.rate ?? null} error={errors[currency]} hint={!own(currency) && fallback ? `Using ${fallback} from before.` : undefined} key={currency} label={`1 ${currency} in lira`} name={currency} optional placeholder={fallback ? String(fallback) : 'Not set'} />
        })}
      </div>
    </Dialog>
  )
}
