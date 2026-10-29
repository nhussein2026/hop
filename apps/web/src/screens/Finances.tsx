// Finances: what comes in each month, what's already spoken for (fixed costs, savings, wishes), the
// budgets for everyday spending, and what's safe to spend today. Spending is logged one purchase
// at a time; wallets hold the real balances. Labels only: never card or account numbers.
import * as D from '../lib/dates.ts'
import { POT_PRIORITY_LABEL, WALLET_KIND_LABEL } from '../lib/labels.ts'
import { canBuy, fixedCosts, formatMoney, isEveryday, monthOf, monthSummary, monthsToGo, potSaved, rateFor, setAsideTotal, subscriptionCharge, toBase, walletBalance } from '../lib/money.ts'
import type { FixedCost, MonthSummary } from '../lib/money.ts'
import type { Route } from '../lib/router.ts'
import { plural } from '../lib/rules.ts'
import type { MoneyEntry, Pot, Wallet } from '../lib/types.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon } from '../components/Icon.tsx'
import { Badge, Banner, Empty, Menu, ProgressBar, Tabs } from '../components/ui.tsx'
import { useConfirm } from '../components/confirm.tsx'
import { useHop } from '../store/store.ts'
import { useMoneyActions } from '../store/money-actions.ts'

const TABS: [string, string, string][] = [
  ['month', 'This month', 'What comes in, what’s spoken for, and what’s safe to spend today.'],
  ['history', 'History', 'Every purchase, income and move, day by day.'],
  ['pots', 'Wishes & savings', 'Things you want to buy, and money you keep aside on purpose.'],
  ['wallets', 'Wallets', 'Where your money is, and how much each one holds.'],
  ['plan', 'Plan', 'Your monthly income, fixed costs, budgets and rates.'],
]

const isMonth = (value: string | undefined): value is string => Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value))

export function Finances({ route }: { route: Route }) {
  const { data } = useHop()
  const editors = useEditors()
  const today = D.today()
  const tab = TABS.find(([key]) => key === route.params[0])?.[0] ?? 'month'
  const month = isMonth(route.query.month) ? route.query.month : monthOf(today)
  const setUp = data.wallets.length > 0
  const base = tab === 'month' ? '#/finances' : `#/finances/${tab}`

  let action = <button className="btn btn-primary" onClick={() => editors.logSpending()} type="button"><Icon className="icon-sm" name="plus" />Log spending</button>
  if (tab === 'wallets') action = <><button className="btn" onClick={() => editors.transfer()} type="button"><Icon className="icon-sm" name="transfer" />Move money</button><button className="btn btn-primary" onClick={() => editors.wallet()} type="button"><Icon className="icon-sm" name="plus" />Add wallet</button></>
  if (tab === 'pots') action = <><button className="btn" onClick={() => editors.pot(null, 'saving')} type="button"><Icon className="icon-sm" name="plus" />Add saving</button><button className="btn btn-primary" onClick={() => editors.pot(null, 'wish')} type="button"><Icon className="icon-sm" name="plus" />Add a wish</button></>

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head-text"><h1 tabIndex={-1}>Finances</h1><p>{setUp ? TABS.find(([key]) => key === tab)![2] : 'Plan the month, log what you spend, and save for what you want.'}</p></div>
        {setUp && <div className="page-head-actions">{action}</div>}
      </header>
      {!setUp
        ? <SetUp />
        : (
          <>
            <Tabs active={tab} items={TABS.map(([key, label]) => [key, label, key === 'month' ? '#/finances' : `#/finances/${key}`])} label="Finances sections" />
            {(tab === 'month' || tab === 'history') && <MonthNav base={base} month={month} today={today} />}
            {tab === 'month' && <MonthTab month={month} />}
            {tab === 'history' && <History category={route.query.category} month={month} />}
            {tab === 'pots' && <Pots />}
            {tab === 'wallets' && <Wallets />}
            {tab === 'plan' && <Plan />}
          </>
        )}
    </div>
  )
}

function SetUp() {
  const actions = useMoneyActions()
  const steps: [string, string, string][] = [
    ['download', 'Your monthly income', 'What arrives each month, in lira, dollars or euros.'],
    ['receipt', 'Fixed costs', 'Rent, phone, transport card. Subscriptions from Accounts count by themselves.'],
    ['chart', 'Budgets', 'What you plan to spend on groceries, eating out and the rest.'],
    ['money', 'Then log each purchase', 'Amount, one tap on the category. Hop shows what’s safe to spend each day.'],
  ]
  return (
    <section className="panel panel-pad money-setup">
      <h2>Organise your money in Hop</h2>
      <ol className="setup-points">
        {steps.map(([icon, title, body]) => <li key={title}><Icon name={icon} /><span><strong>{title}</strong><span className="small muted">{body}</span></span></li>)}
      </ol>
      <p className="small muted privacy-line"><Icon className="icon-sm" name="shield" />Hop keeps names like “Ziraat card”, never card or account numbers.</p>
      <div><button className="btn btn-primary" onClick={() => void actions.setup()} type="button">Set up Finances</button></div>
      <p className="xs muted">This adds a Cash wallet and starter categories. You can rename or remove them.</p>
    </section>
  )
}

function MonthNav({ base, month, today }: { base: string; month: string; today: string }) {
  const href = (m: string) => (m === monthOf(today) ? base : `${base}?month=${m}`)
  const step = (n: number) => monthOf(D.addMonths(`${month}-01`, n))
  return (
    <div className="cal-nav money-nav">
      <a aria-label="Previous month" className="icon-btn" href={href(step(-1))}><Icon name="back" /></a>
      <a aria-label="Next month" className="icon-btn" href={href(step(1))}><Icon name="chevron" /></a>
      <h2 aria-live="polite" className="cal-title">{D.monthLong(`${month}-01`)}</h2>
      {month !== monthOf(today) && <a className="btn btn-sm" href={base}>This month</a>}
    </div>
  )
}

/* ---- This month ------------------------------------------------------------------------- */
function MonthTab({ month }: { month: string }) {
  const { data } = useHop()
  const editors = useEditors()
  const today = D.today()
  const m = monthSummary(data, month, today)
  const current = month === monthOf(today)
  const steps: [boolean, string, () => void][] = [
    [data.incomeSources.length > 0, 'Add your monthly income', () => editors.income()],
    [data.bills.length > 0, 'Add fixed costs like rent', () => editors.bill()],
    [m.budget > 0, 'Set budgets for everyday spending', () => editors.budgets()],
  ]

  return (
    <>
      {m.missingRates.length > 0 && (
        <Banner action={<button className="btn btn-sm" onClick={() => editors.rates(month)} type="button">Add rate</button>} icon="alert" title={`No ${m.missingRates.join(' or ')} rate yet.`} tone="warning">
          Amounts in {m.missingRates.join(' and ')} are left out of the totals until you add how many lira one is worth.
        </Banner>
      )}
      {current && steps.some(([done]) => !done) && (
        <section aria-labelledby="ms-h" className="panel panel-pad money-steps">
          <h2 id="ms-h">Plan your month in three steps</h2>
          <ol>
            {steps.map(([done, label, open]) => (
              <li className={done ? 'is-done' : ''} key={label}>
                <Icon name={done ? 'check' : 'chevron'} />
                {done ? <span>{label}</span> : <button className="link-btn" onClick={open} type="button">{label}</button>}
              </li>
            ))}
          </ol>
        </section>
      )}
      <div className="money-top">
        <SafeCard m={m} />
        <Breakdown m={m} />
      </div>
      <Budgets m={m} month={month} />
      <FixedCosts items={m.fixed.items} month={month} />
    </>
  )
}

function SafeCard({ m }: { m: MonthSummary }) {
  const editors = useEditors()
  const over = m.left < 0
  if (!m.budget) {
    return (
      <section aria-labelledby="safe-h" className="panel panel-pad safe-card">
        <h2 className="metric-label" id="safe-h">Safe to spend today</h2>
        <p className="small muted">Set budgets for everyday spending and Hop works out what you can spend each day.</p>
        <div><button className="btn btn-sm" onClick={() => editors.budgets()} type="button">Set budgets</button></div>
        {m.spent > 0 && <p className="small num">Spent this month: {formatMoney(m.spent)}</p>}
      </section>
    )
  }
  return (
    <section aria-labelledby="safe-h" className={`panel panel-pad safe-card${over ? ' is-over' : ''}`}>
      <h2 className="metric-label" id="safe-h">{m.safeToday === null ? 'Everyday spending' : 'Safe to spend today'}</h2>
      {m.safeToday === null
        ? <span className="big-num num">{formatMoney(m.spent)}</span>
        : <span className="big-num num">{formatMoney(m.safeToday)}</span>}
      <p className="small muted num">
        {m.safeToday === null
          ? `spent of ${formatMoney(m.budget)} budgeted.`
          : over
            ? `Over budget by ${formatMoney(-m.left)} this month. Spend only what you must until the month ends.`
            : `${formatMoney(m.left)} left of ${formatMoney(m.budget)}, shared over ${plural(m.daysLeft, 'day')}.`}
      </p>
      {m.safeToday !== null && <p className="small num">Spent today: <strong>{formatMoney(m.spentToday)}</strong>{m.spentToday > m.safeToday && m.safeToday > 0 ? <span className="is-warning">, more than today’s share</span> : null}</p>}
    </section>
  )
}

function Breakdown({ m }: { m: MonthSummary }) {
  const lines: [string, number, string][] = [
    ['Income', m.income.received + m.income.expected, m.income.expected && m.income.received ? `${formatMoney(m.income.received)} received, ${formatMoney(m.income.expected)} expected` : m.income.expected ? 'Expected' : 'Received'],
    ['Fixed costs', -(m.fixed.paid + m.fixed.due), m.fixed.due ? `${formatMoney(m.fixed.paid)} paid, ${formatMoney(m.fixed.due)} to pay` : m.fixed.paid ? 'All paid' : ''],
    ['Set aside', -m.setAside, 'For wishes and savings'],
    ...(m.wishes ? [['Wishes bought', -m.wishes, 'Beyond what was set aside for them'] as [string, number, string]] : []),
    ['Everyday budgets', -m.budget, m.budget ? `${formatMoney(m.spent)} spent so far` : 'No budgets yet'],
  ]
  return (
    <section aria-labelledby="plan-h" className="panel panel-pad">
      <h2 className="metric-label" id="plan-h">The month’s plan</h2>
      <dl className="money-lines">
        {lines.map(([label, amount, detail]) => (
          <div key={label}><dt>{label}{detail && <span className="xs muted">{detail}</span>}</dt><dd className="num">{amount < 0 ? '−' : ''}{formatMoney(Math.abs(amount))}</dd></div>
        ))}
        <div className={`money-total${m.unplanned < 0 ? ' is-danger' : ''}`}>
          <dt>Not planned yet<span className="xs muted">{m.unplanned < 0 ? `You’ve planned ${formatMoney(-m.unplanned)} more than comes in.` : m.unplanned > 0 ? 'Give it a job: put it aside or raise a budget.' : 'Every lira has a job.'}</span></dt>
          <dd className="num">{formatMoney(m.unplanned)}</dd>
        </div>
      </dl>
    </section>
  )
}

function Budgets({ m, month }: { m: MonthSummary; month: string }) {
  const editors = useEditors()
  const lines = m.byCategory.filter((c) => c.budget || c.spent)
  return (
    <section aria-labelledby="bud-h" className="section">
      <div className="section-head"><h2 id="bud-h">Everyday spending</h2><button className="btn btn-sm btn-ghost" onClick={() => editors.budgets()} type="button"><Icon className="icon-sm" name="edit" />Budgets</button></div>
      {lines.length
        ? (
          <div className="rows">
            {lines.map((c) => {
              const over = c.budget !== null && c.spent > c.budget
              return (
                <a className="row budget-row" href={`#/finances/history?month=${month}&category=${c.id ?? 'none'}`} key={c.id ?? 'none'}>
                  <div className="row-main">
                    <span className="row-title">{c.name}</span>
                    {c.budget ? <ProgressBar label={`${c.name}: spent of budget`} pct={Math.min(100, Math.round((c.spent / c.budget) * 100))} /> : null}
                  </div>
                  <span className={`num small${over ? ' is-danger' : ''}`}>{formatMoney(c.spent)}{c.budget ? <span className="muted"> of {formatMoney(c.budget)}</span> : <span className="muted"> no budget</span>}</span>
                </a>
              )
            })}
          </div>
        )
        : <p className="small muted">Nothing logged yet. Use Log spending after each purchase; it takes two taps.</p>}
    </section>
  )
}

function FixedCosts({ items, month }: { items: FixedCost[]; month: string }) {
  const { data } = useHop()
  const editors = useEditors()
  const actions = useMoneyActions()
  const today = D.today()
  if (!items.length) return null

  // One tap when it's clear which wallet pays it; otherwise ask.
  function pay(cost: FixedCost) {
    const open = data.wallets.filter((w) => !w.archived)
    const usual = cost.bill?.walletId ? open.find((w) => w.id === cost.bill!.walletId) : undefined
    const only = open.filter((w) => w.currency === cost.currency)
    const wallet = usual?.currency === cost.currency ? usual : only.length === 1 ? only[0] : undefined
    const date = month === monthOf(today) ? today : cost.due
    if (wallet) void actions.bills.pay(cost, { amount: cost.amount, walletId: wallet.id, date }, wallet)
    else editors.payCost(cost)
  }

  return (
    <section aria-labelledby="fix-h" className="section">
      <div className="section-head"><h2 id="fix-h">Fixed costs</h2><a className="small" href="#/finances/plan">Change</a></div>
      <div className="rows">
        {items.map((c) => {
          const days = D.diffDays(c.due, today)
          const late = !c.paid && days < 0 && !c.account
          return (
            <div className="row" key={c.key}>
              <span aria-hidden="true" className="type-tile type-repo"><Icon name={c.account ? 'key' : 'receipt'} /></span>
              <div className="row-main">
                <span className="row-title">{c.name}</span>
                <div className="row-meta">
                  <span className="num">{formatMoney(c.amount, c.currency)}</span>
                  {c.paid
                    ? <span><Icon name="check" />Paid {D.inSentence(c.paid.date, today)}</span>
                    : c.account
                      ? <span><Icon name="refresh" />{days > 0 ? `Renews ${D.inSentence(c.due, today)}` : `Charged ${D.inSentence(c.due, today)}: tap Paid to log it`}</span>
                      : <span className={late ? 'is-danger' : days <= 3 ? 'is-warning' : ''}><Icon name="calendar" />{D.dueLabel(c.due, today)}</span>}
                  {c.account && <span>Subscription</span>}
                </div>
              </div>
              <div className="row-actions">
                {c.paid
                  ? <Badge tone="success">Paid</Badge>
                  : <button className="btn btn-sm" onClick={() => pay(c)} type="button"><Icon className="icon-sm" name="check" />Paid</button>}
                <Menu items={[
                  ...(c.paid ? [{ label: 'Open the payment', icon: 'edit', onSelect: () => editors.entry(c.paid!) }] : [{ label: 'Paid a different amount…', icon: 'money', onSelect: () => editors.payCost(c) }]),
                  c.bill ? { label: 'Edit fixed cost', icon: 'edit', onSelect: () => editors.bill(c.bill) } : { label: 'Edit in Accounts', icon: 'key', onSelect: () => editors.account(c.account) },
                ]} label={`Actions for ${c.name}`} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ---- History ------------------------------------------------------------------------------ */
function History({ month, category }: { month: string; category?: string }) {
  const { data } = useHop()
  const today = D.today()
  const name = category === 'none' ? 'No category' : data.spendCategories.find((c) => c.id === category)?.name
  const entries = data.moneyEntries
    .filter((e) => monthOf(e.date) === month && (!category || (e.kind === 'expense' && (e.categoryId ?? 'none') === category && !e.billId && !e.accountId && !e.potId)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  const days = [...new Set(entries.map((e) => e.date))]

  return (
    <>
      {category && name && <Banner action={<a className="btn btn-sm" href={`#/finances/history?month=${month}`}>Show all</a>} icon="filter" title={`Only ${name}`} tone="info" />}
      {!entries.length
        ? <Empty body={month === monthOf(today) ? 'Log each purchase with Log spending: the amount, then one tap on what it was for.' : 'Nothing was logged this month.'} icon="money" pad={false} title={`Nothing logged in ${D.monthLong(`${month}-01`)}`} />
        : days.map((day) => {
          const list = entries.filter((e) => e.date === day)
          const spent = list.filter(isEveryday).reduce((sum, e) => sum + (toBase(e.amount, e.currency, month, data.moneyRates) ?? 0), 0)
          return (
            <section aria-label={D.long(day)} className="section" key={day}>
              <div className="section-head"><h2 className="group-label">{D.relative(day, today)}{D.diffDays(day, today) < -1 || D.diffDays(day, today) > 1 ? '' : `, ${D.short(day)}`}</h2>{spent > 0 && <span className="small muted num">{formatMoney(spent)} spent</span>}</div>
              <div className="rows">{list.map((e) => <EntryRow entry={e} key={e.id} />)}</div>
            </section>
          )
        })}
    </>
  )
}

function EntryRow({ entry: e }: { entry: MoneyEntry }) {
  const { data } = useHop()
  const editors = useEditors()
  const actions = useMoneyActions()
  const wallet = data.wallets.find((w) => w.id === e.walletId)
  const to = data.wallets.find((w) => w.id === e.toWalletId)
  const category = data.spendCategories.find((c) => c.id === e.categoryId)
  const pays = e.billId ? data.bills.find((b) => b.id === e.billId)?.name : e.accountId ? data.accounts.find((a) => a.id === e.accountId)?.name : null
  const wish = e.potId ? data.pots.find((p) => p.id === e.potId)?.name : null
  const source = e.incomeId ? data.incomeSources.find((s) => s.id === e.incomeId)?.name : null
  const title = e.kind === 'transfer' ? `${wallet?.name ?? 'Wallet'} to ${to?.name ?? 'wallet'}` : e.kind === 'adjust' ? `${wallet?.name ?? 'Wallet'} matched` : e.note || source || pays || wish || category?.name || (e.kind === 'income' ? 'Income' : 'Spending')
  const icon = { expense: pays ? 'receipt' : wish ? 'star' : 'money', income: 'download', transfer: 'transfer', adjust: 'sliders' }[e.kind]
  const sign = e.kind === 'income' || (e.kind === 'adjust' && e.amount > 0) ? '+' : e.kind === 'transfer' ? '' : '−'

  return (
    <div className="row row-link">
      <span aria-hidden="true" className={`type-tile money-${e.kind}`}><Icon name={icon} /></span>
      <div className="row-main">
        <button className="row-open" onClick={() => editors.entry(e)} type="button">{title}</button>
        <div className="row-meta">
          {e.kind === 'expense' && category && title !== category.name && <span>{category.name}</span>}
          {pays && title !== pays && <span>Pays {pays}</span>}
          {wish && title !== wish && <span>Wish: {wish}</span>}
          {e.kind !== 'transfer' && wallet && <span>{wallet.name}</span>}
          {e.kind === 'transfer' && e.toAmount !== null && to && <span className="num">Arrived as {formatMoney(e.toAmount, to.currency)}</span>}
        </div>
      </div>
      <span className={`num money-amount money-amount-${e.kind}`}>{sign}{formatMoney(Math.abs(e.amount), e.currency)}</span>
      <div className="row-actions">
        <Menu items={[{ label: 'Edit', icon: 'edit', onSelect: () => editors.entry(e) }, { label: 'Delete', icon: 'trash', danger: true, onSelect: () => void actions.entries.remove(e) }]} label={`Actions for ${title}`} />
      </div>
    </div>
  )
}

/* ---- Wishes and savings ---------------------------------------------------------------------- */
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

function Pots() {
  const { data } = useHop()
  const editors = useEditors()
  const today = D.today()
  const open = data.pots.filter((p) => p.status === 'saving')
  const savings = open.filter((p) => p.kind === 'saving').sort((a, b) => a.position - b.position)
  const wishes = open.filter((p) => p.kind === 'wish').sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.waitUntil ?? '').localeCompare(b.waitUntil ?? ''))
  const closed = data.pots.filter((p) => p.status !== 'saving').sort((a, b) => (b.closedOn ?? '').localeCompare(a.closedOn ?? ''))
  const total = setAsideTotal(data, monthOf(today))

  return (
    <>
      {total > 0 && <p className="small muted num">{formatMoney(total)} set aside in all. It stays in your wallets; Hop counts it as spoken for.</p>}
      <section aria-labelledby="sav-h" className="section">
        <div className="section-head"><h2 id="sav-h">Savings</h2></div>
        {savings.length
          ? <div className="rows">{savings.map((p) => <PotRow key={p.id} pot={p} />)}</div>
          : <Empty action={() => editors.pot(null, 'saving')} actionLabel="Add saving" body="Start an emergency fund: even a small amount each month. Three months of costs is a good first goal." icon="shield" pad={false} secondary title="No savings yet" />}
      </section>
      <section aria-labelledby="wish-h" className="section">
        <div className="section-head"><h2 id="wish-h">Wish list</h2></div>
        {wishes.length
          ? <div className="rows">{wishes.map((p) => <PotRow key={p.id} pot={p} />)}</div>
          : <Empty action={() => editors.pot(null, 'wish')} actionLabel="Add a wish" body="Something you’d like to buy goes here first. After 30 days, if you still want it, save for it and buy it without guilt." icon="star" pad={false} secondary title="No wishes yet" />}
      </section>
      {closed.length > 0 && (
        <details className="done-list">
          <summary>Bought, dropped or reached <span className="count">{closed.length}</span></summary>
          <div className="rows">{closed.map((p) => <PotRow key={p.id} pot={p} />)}</div>
        </details>
      )}
    </>
  )
}

function PotRow({ pot: p }: { pot: Pot }) {
  const { data } = useHop()
  const editors = useEditors()
  const actions = useMoneyActions()
  const confirm = useConfirm()
  const today = D.today()
  const saved = potSaved(p, data.potMoves)
  const togo = monthsToGo(p, data.potMoves)
  const open = p.status === 'saving'
  const ready = canBuy(p, today)
  const pct = p.target ? Math.min(100, Math.round((saved / p.target) * 100)) : null
  const closedLabel = { bought: 'Bought', dropped: 'Dropped', done: 'Reached', saving: '' }[p.status]

  async function drop() {
    if (!await confirm({ title: `Drop ${p.name}?`, body: saved ? `The ${formatMoney(saved, p.currency)} set aside for it is free again.` : 'It moves to the closed list. Not buying it is a win too.', confirmLabel: 'Drop it' })) return
    void actions.pots.update(p, { status: 'dropped' }, `${p.name} dropped`, true)
  }

  return (
    <div className="row row-link pot-row">
      <span aria-hidden="true" className={`type-tile ${p.kind === 'wish' ? 'type-note' : 'type-find-model'}`}><Icon name={p.kind === 'wish' ? 'star' : 'shield'} /></span>
      <div className="row-main">
        <button className="row-open" onClick={() => editors.pot(p)} type="button">{p.name}</button>
        {open && pct !== null && <ProgressBar label={`${p.name}: saved of target`} pct={pct} />}
        <div className="row-meta">
          <span className="num">{p.target ? `${formatMoney(saved, p.currency)} of ${formatMoney(p.target, p.currency)}` : `${formatMoney(saved, p.currency)} set aside`}</span>
          {open && p.monthly ? <span className="num">{formatMoney(p.monthly, p.currency)} a month{togo ? `, ${plural(togo, 'month')} to go` : ''}</span> : null}
          {open && p.kind === 'wish' && p.waitUntil && (ready ? <span className="is-success"><Icon name="check" />The wait is over</span> : <span><Icon name="clock" />Can buy from {D.short(p.waitUntil)} ({plural(D.diffDays(p.waitUntil, today), 'day')})</span>)}
          {p.kind === 'wish' && open && <span>{POT_PRIORITY_LABEL[p.priority]}</span>}
          {!open && <Badge tone={p.status === 'bought' || p.status === 'done' ? 'success' : undefined}>{closedLabel}{p.closedOn ? ` ${D.short(p.closedOn)}` : ''}</Badge>}
        </div>
        {p.why && <p className="xs muted pot-why">{p.why}</p>}
      </div>
      <div className="row-actions">
        {p.url && <a aria-label={`Open the link for ${p.name}`} className="icon-btn" href={p.url} rel="noopener noreferrer" target="_blank"><Icon name="external" /></a>}
        {open && (p.kind === 'wish' && ready
          ? <button className="btn btn-sm" onClick={() => editors.buyWish(p)} type="button">Buy</button>
          : <button className="btn btn-sm" onClick={() => editors.putAside(p)} type="button">Put aside</button>)}
        <Menu items={open
          ? [
            { label: 'Edit', icon: 'edit', onSelect: () => editors.pot(p) },
            ...(p.kind === 'wish' && ready ? [{ label: 'Put aside', icon: 'plus', onSelect: () => editors.putAside(p) }] : []),
            ...(saved > 0 && !(p.kind === 'wish' && ready) ? [{ label: 'Take back', icon: 'minus', onSelect: () => editors.putAside(p) }] : []),
            ...(p.kind === 'wish' && !ready ? [{ label: 'End the wait now', icon: 'clock', onSelect: () => void actions.pots.update(p, { waitUntil: today }, `${p.name} can be bought now`, true) }] : []),
            p.kind === 'wish'
              ? { label: 'Don’t want it any more', icon: 'x', onSelect: () => void drop() }
              : { label: 'Goal reached', icon: 'award', onSelect: () => void actions.pots.update(p, { status: 'done' }, `${p.name}: goal reached. Well done.`, true) },
          ]
          : [
            { label: 'Open again', icon: 'refresh', onSelect: () => void actions.pots.update(p, { status: 'saving' }, `${p.name} is open again`, true) },
            { label: 'Delete', icon: 'trash', danger: true, onSelect: () => editors.pot(p) },
          ]} label={`Actions for ${p.name}`} />
      </div>
    </div>
  )
}

/* ---- Wallets ---------------------------------------------------------------------------------- */
function Wallets() {
  const { data } = useHop()
  const today = D.today()
  const month = monthOf(today)
  const open = data.wallets.filter((w) => !w.archived).sort((a, b) => a.position - b.position)
  const archived = data.wallets.filter((w) => w.archived)
  const balances = open.map((w) => ({ w, balance: walletBalance(w, data.moneyEntries), base: toBase(walletBalance(w, data.moneyEntries), w.currency, month, data.moneyRates) }))
  const total = balances.reduce((sum, b) => sum + (b.base ?? 0), 0)
  const aside = setAsideTotal(data, month)
  const missing = balances.some((b) => b.base === null)

  return (
    <>
      <div className="metric-row money-metrics">
        <div className="metric"><span className="metric-label">In all wallets</span><span className="metric-value num">{formatMoney(Math.round(total))}</span>{missing && <span className="xs muted">Some wallets need a rate to count.</span>}</div>
        <div className="metric"><span className="metric-label">Set aside</span><span className="metric-value num">{formatMoney(Math.round(aside))}</span></div>
        <div className="metric"><span className="metric-label">Free</span><span className={`metric-value num${total - aside < 0 ? ' is-danger' : ''}`}>{formatMoney(Math.round(total - aside))}</span></div>
      </div>
      <section aria-labelledby="wal-h" className="section">
        <div className="section-head"><h2 id="wal-h">Wallets</h2></div>
        <div className="rows">{balances.map(({ w, balance, base }) => <WalletRow balance={balance} base={base} key={w.id} wallet={w} />)}</div>
        <p className="xs muted">Once a week, check your banking app and use Match balance, so Hop’s numbers stay true.</p>
      </section>
      {archived.length > 0 && (
        <details className="done-list">
          <summary>Archived <span className="count">{archived.length}</span></summary>
          <div className="rows">{archived.map((w) => <WalletRow balance={walletBalance(w, data.moneyEntries)} base={null} key={w.id} wallet={w} />)}</div>
        </details>
      )}
    </>
  )
}

function WalletRow({ wallet: w, balance, base }: { wallet: Wallet; balance: number; base: number | null }) {
  const editors = useEditors()
  const actions = useMoneyActions()
  const [kind, icon] = WALLET_KIND_LABEL[w.kind]
  return (
    <div className="row row-link">
      <span aria-hidden="true" className="type-tile type-repo"><Icon name={icon} /></span>
      <div className="row-main">
        <button className="row-open" onClick={() => editors.wallet(w)} type="button">{w.name}</button>
        <div className="row-meta"><span>{kind}</span>{w.currency !== 'TRY' && <span className="num">{base === null ? 'Needs a rate' : `≈ ${formatMoney(Math.round(base))}`}</span>}</div>
      </div>
      <span className={`num money-balance${balance < 0 ? ' is-danger' : ''}`}>{formatMoney(balance, w.currency)}</span>
      <div className="row-actions">
        <Menu items={w.archived
          ? [{ label: 'Open again', icon: 'refresh', onSelect: () => void actions.wallets.update(w, { archived: false }, `${w.name} is open again`) }]
          : [
            { label: 'Match balance', icon: 'sliders', onSelect: () => editors.matchBalance(w) },
            { label: 'Move money', icon: 'transfer', onSelect: () => editors.transfer(w) },
            { label: 'Edit', icon: 'edit', onSelect: () => editors.wallet(w) },
          ]} label={`Actions for ${w.name}`} />
      </div>
    </div>
  )
}

/* ---- Plan ----------------------------------------------------------------------------------------- */
function Plan() {
  const { data } = useHop()
  const editors = useEditors()
  const today = D.today()
  const month = monthOf(today)
  const received = (id: string) => data.moneyEntries.find((e) => e.kind === 'income' && e.incomeId === id && monthOf(e.date) === month)
  const subscriptions = data.accounts.filter((a) => a.status === 'active' && a.cost && a.cycle !== 'none')
  const categories = data.spendCategories.filter((c) => !c.archived).sort((a, b) => a.position - b.position)
  const budgeted = categories.filter((c) => c.monthlyBudget)
  const fixedTotal = Math.round(fixedCosts(data, month).reduce((sum, c) => sum + (c.base ?? 0), 0) * 100) / 100
  const rates = (['USD', 'EUR'] as const).map((currency) => [currency, rateFor(data.moneyRates, month, currency)] as const)

  return (
    <>
      <section aria-labelledby="inc-h" className="section">
        <div className="section-head"><h2 id="inc-h">Monthly income</h2><button className="btn btn-sm btn-ghost" onClick={() => editors.income()} type="button"><Icon className="icon-sm" name="plus" />Add</button></div>
        {data.incomeSources.length
          ? (
            <div className="rows">
              {data.incomeSources.map((s) => {
                const got = received(s.id)
                return (
                  <div className={`row row-link${s.active ? '' : ' is-muted'}`} key={s.id}>
                    <span aria-hidden="true" className="type-tile money-income"><Icon name="download" /></span>
                    <div className="row-main">
                      <button className="row-open" onClick={() => editors.income(s)} type="button">{s.name}</button>
                      <div className="row-meta"><span className="num">{formatMoney(s.amount, s.currency)} a month</span>{s.payDay && <span>Around day {s.payDay}</span>}{!s.active && <Badge>Paused</Badge>}</div>
                    </div>
                    <div className="row-actions">
                      {s.active && (got ? <Badge tone="success">Received {D.short(got.date)}</Badge> : <button className="btn btn-sm" onClick={() => editors.receiveIncome(s)} type="button">Received</button>)}
                    </div>
                  </div>
                )
              })}
            </div>
          )
          : <p className="small muted">What arrives each month, like your salary. Hop counts it as expected until it arrives.</p>}
        <div><button className="btn btn-sm btn-ghost" onClick={() => editors.receiveIncome(null)} type="button"><Icon className="icon-sm" name="download" />Other money received</button></div>
      </section>

      <section aria-labelledby="bills-h" className="section">
        <div className="section-head"><h2 id="bills-h">Fixed costs</h2><button className="btn btn-sm btn-ghost" onClick={() => editors.bill()} type="button"><Icon className="icon-sm" name="plus" />Add</button></div>
        {data.bills.length || subscriptions.length
          ? (
            <div className="rows">
              {[...data.bills].sort((a, b) => a.dueDay - b.dueDay).map((b) => (
                <div className={`row row-link${b.active ? '' : ' is-muted'}`} key={b.id}>
                  <span aria-hidden="true" className="type-tile type-repo"><Icon name="receipt" /></span>
                  <div className="row-main">
                    <button className="row-open" onClick={() => editors.bill(b)} type="button">{b.name}</button>
                    <div className="row-meta"><span className="num">{formatMoney(b.amount, b.currency)} a month</span><span>Due on day {b.dueDay}</span>{!b.active && <Badge>Paused</Badge>}</div>
                  </div>
                </div>
              ))}
              {subscriptions.map((a) => (
                <div className="row row-link" key={a.id}>
                  <span aria-hidden="true" className="type-tile type-repo"><Icon name="key" /></span>
                  <div className="row-main">
                    <button className="row-open" onClick={() => editors.account(a)} type="button">{a.name}</button>
                    <div className="row-meta"><span className="num">{formatMoney(a.cost!, a.currency)} {a.cycle === 'yearly' ? 'a year' : a.cycle === 'weekly' ? 'a week' : 'a month'}</span><span>Subscription, from Accounts</span>{a.cycle === 'yearly' && !subscriptionCharge(a, month) && <span>Not this month</span>}</div>
                  </div>
                </div>
              ))}
            </div>
          )
          : <p className="small muted">Rent, phone, internet, a transport card: what you pay every month.</p>}
        {fixedTotal > 0 && <p className="xs muted num">{formatMoney(fixedTotal)} in {D.monthLong(`${month}-01`).split(' ')[0]}, subscriptions included.</p>}
      </section>

      <section aria-labelledby="bplan-h" className="section">
        <div className="section-head"><h2 id="bplan-h">Budgets</h2><button className="btn btn-sm btn-ghost" onClick={() => editors.budgets()} type="button"><Icon className="icon-sm" name="edit" />Edit</button></div>
        {budgeted.length
          ? <p className="small num">{budgeted.map((c) => `${c.name} ${formatMoney(c.monthlyBudget!)}`).join(' · ')}</p>
          : <p className="small muted">No budgets yet. Without them Hop can’t say what’s safe to spend each day.</p>}
        <p className="xs muted">{plural(categories.length, 'category', 'categories')}: {categories.map((c) => c.name).join(', ')}.</p>
      </section>

      <section aria-labelledby="rate-h" className="section">
        <div className="section-head"><h2 id="rate-h">Dollar and euro rates</h2><button className="btn btn-sm btn-ghost" onClick={() => editors.rates(month)} type="button"><Icon className="icon-sm" name="edit" />Set for {D.monthLong(`${month}-01`).split(' ')[0]}</button></div>
        <p className="small num">{rates.map(([currency, rate]) => (rate ? `1 ${currency} = ${rate} TL` : `${currency}: not set`)).join(' · ')}</p>
        <p className="xs muted">Hop never looks rates up. Type the rate your bank gives you; it’s used for totals in lira until you set a new one.</p>
      </section>
    </>
  )
}

