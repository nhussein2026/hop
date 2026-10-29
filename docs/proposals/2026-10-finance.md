# Proposal: Money (Monthly Budget, Spending, Wishes, Savings, Wallets)

Written 2026-10-29 from the user's request: "I got amount of money each month so I need to organise everything. Some costs I pay each month like rent and food, some daily buying, and some things I wish to have." This file is the hand-off to an implementation chat: context, decisions, design, acceptance criteria and what is deliberately not built. Read it whole before changing code. **Version: v1.5.0** (agreed 2026-10-29; Gates, Score targets and the Error log move to v1.6.0).

| # | Part | Size |
| --- | --- | --- |
| M1 | [Wallets and the ledger](#m1-wallets-and-the-ledger): where money is, and every movement in or out | Medium |
| M2 | [Mixed currencies](#m2-mixed-currencies): TL, USD and EUR, totals in TL at your monthly rate | Small |
| M3 | [The month](#m3-the-month): income, fixed costs, spending budgets, set aside, left to spend, safe per day | Medium |
| M4 | [Logging a purchase](#m4-logging-a-purchase): amount, then one tap on a category | Small |
| M5 | [Wishes and savings](#m5-wishes-and-savings): pots you put money aside for, with a waiting time for wishes | Small to medium |
| M6 | [Money on Today](#m6-money-on-today): safe to spend today, bills due | Small |

## Context

The user is paid monthly from two jobs (Veribir and Garanti; about 24,900 TL, roughly $500, in October 2026), lives in İstanbul, and spends mostly in TL. Some amounts are in USD or EUR. The lira lost about 19% against the dollar in the past year, so the USD value of a month matters: "My week" judges job offers in USD per month and per hour.

Decided in chat (2026-10-29):

| Question | Decision |
| --- | --- |
| Scope of the first version | All of it: monthly budget, a daily spending amount, wish list with saving, savings and emergency fund, balances per wallet. |
| Currencies | Mixed: every entry can be TRY, USD or EUR. Totals are in TL. |
| Exchange rates | Typed in by the user for each month (USD→TL, EUR→TL). Hop has no outside services (see [Security](../SECURITY.md)); it never fetches rates. |
| Logging everyday buying | Each purchase, quickly: amount, then one tap on a category. |
| Subscriptions | Monthly and yearly accounts in Notes → Accounts already have a cost: they count as fixed costs automatically, never typed twice. |

What the user wants to see every day: **how much is left this month** and **how much is safe to spend today**.

## M1. Wallets and the Ledger

### Data model

- `wallets`: `name`, `kind` (`cash | bank | card | app`), `currency` (TRY, USD or EUR), `openingBalance`, `openedOn`, `archived`, `position`. Examples: Cash (TRY), Ziraat (TRY), Papara (TRY), Wise (USD).
- `money_entries`, one row per movement: `date`, `kind` (`income | expense | transfer | adjust`), `amount`, `currency`, `walletId`, and depending on kind:
  - `expense`: `categoryId`, and `billId` when it pays a fixed cost (or `accountId` for a subscription), `potId` when it buys a wish.
  - `income`: `incomeId` (the source) when it's a regular income.
  - `transfer`: `toWalletId`, and `toAmount` when the two wallets have different currencies (changing dollars into lira).
  - `adjust`: a signed amount that makes a wallet match reality ("Match my balance").
  - Plus `note`, timestamps.
- Amounts are positive, except `adjust`. An entry's currency is its wallet's currency.

### Rules

- **Balance** = opening balance + income − expenses − transfers out + transfers in (`toAmount` for another currency) + adjustments, from `openedOn`.
- **Match my balance:** type what the wallet really holds; Hop records the difference as an `adjust` entry dated today, so history stays honest.
- A wallet with entries can be archived, never deleted. An unused one can be deleted.

## M2. Mixed Currencies

- `money_rates`: `month` (YYYY-MM), `currency` (USD or EUR), `rate` (TL for one unit), unique per month and currency.
- Any amount converts to TL at its month's rate; a month without one uses the closest earlier month's rate. With no rate at all, the month shows "Add the USD rate for October" and leaves those amounts out of the totals instead of guessing.
- The month's totals also show in USD at that month's rate ("24,900 TL ≈ $501").

## M3. The Month

### Data model

- `income_sources`: `name`, `amount` (expected), `currency`, `payDay` (1–31, optional), `walletId` (where it usually lands), `active`. A source is received each month by an `income` entry with its `incomeId`; the amount actually received can differ.
- `bills`: fixed monthly costs (`name`, `amount`, `currency`, `dueDay`, `categoryId`, `walletId`, `active`). Paid each month by an `expense` entry with its `billId`.
- `spend_categories`: `name`, `monthlyBudget` (TL, optional), `position`, `archived`. Starter set: Groceries, Eating out, Transport, Home, Health, Personal, Education, Family & gifts, Other.

### The month's numbers (all in TL)

| Number | Meaning |
| --- | --- |
| Income | Received this month, plus expected sources not received yet. |
| Fixed costs | Bills plus subscriptions from Accounts (monthly cost, a yearly one in the month it renews), paid and still due. |
| Set aside | Planned monthly amounts of the pots (M5). |
| Spending budget | The categories' monthly budgets. |
| **Unplanned** | Income − fixed costs − set aside − spending budget. Negative means "Your plan spends 1,250 TL more than you earn". |
| Spent | Expenses this month that aren't fixed costs or wish purchases, by category. |
| **Left to spend** | Spending budget − spent (and Unplanned if the user turns that on). |
| **Safe today** | Left to spend ÷ days left in the month, today included. This is the "daily spending amount". |

- A category over its budget shows red; the overspend comes out of what's left for the others, so "Left to spend" is never flattered.
- Past months stay viewable (previous/next month), with their numbers as they were.

### Screens

**Money** (new place in the sidebar, after Notes), with tabs:

- **Month:** the numbers above; fixed costs with a **Paid** button each (records the expense in its wallet); income sources with **Received**; categories with budget bars; the month's USD rate.
- **Spending:** every entry of the month, newest first, filterable by category and wallet; tap to edit or delete (with Undo).
- **Wishes & savings:** pots (M5).
- **Wallets:** each wallet's balance (and how much of it is set aside), transfers, Match my balance.
- **Plan:** income sources, fixed costs, categories with budgets, rates. Edited here; used everywhere.

First visit: "Set up Money" creates the starter categories and a Cash wallet in TRY in one step.

## M4. Logging a Purchase

- **Log spending** opens a small dialog: amount first (number keyboard), then the categories as big buttons. One tap on a category saves it, today, from the last wallet used on this device. Currency follows the wallet; a note, the date and another wallet are optional, one tap away.
- Opens from: the Money screen, the global **Add** menu ("Spending"), and Today's money card.
- Every save says "85 TL · Groceries · Cash" with Undo.

## M5. Wishes and Savings

- `pots`: `name`, `kind` (`wish | saving`), `target` (price or goal, optional for an open-ended saving), `currency`, `monthly` (the amount to put aside each month, optional), `priority` (`high | medium | low`, wishes), `why`, `url`, `waitUntil` (wishes: the first day it may be bought), `status` (`saving | done | bought | dropped`).
- `pot_moves`: `date`, `amount` (signed: put aside or take back), `note`. Putting money aside **earmarks** it; the money stays in its wallet. Wallets show "4,000 TL · 1,500 set aside".
- **Wish:** added with its price and why; `waitUntil` defaults to 30 days later ("Can buy from 28 Nov"), against impulse buys. **Bought** records the expense (category of choice, from a wallet) and releases what was set aside. **Drop** releases it too.
- **Emergency fund:** a saving pot whose suggested target is 3 × the month's fixed costs (the user can change it).
- Pots show saved / target, months left at the monthly amount, and are listed high priority first.

## M6. Money on Today

- Today's side column gets a small card: "Safe to spend today 412 TL · Spent today 85 TL" with **Log spending**. Shown once Money is set up.
- Needs attention: a fixed cost due within 3 days and not paid ("Rent due Sat 1 Nov, 12,000 TL"); a fixed cost overdue; a month without its USD rate when it has USD amounts.

## Data, Backups, Docs

- Migration: `wallets`, `money_entries`, `money_rates`, `income_sources`, `bills`, `spend_categories`, `pots`, `pot_moves`. Only `CREATE TABLE`.
- Backups: all eight tables, defaulting to empty, so older backups still restore.
- Docs: `API.md` (Money routes), `DATABASE.md`, `README.md` (Money row), `SECURITY.md` (no card or account numbers in Money either: labels only, like Accounts).
- Tests: balances across currencies and transfers, month numbers (with a missing rate, an overspent category, subscriptions from Accounts), safe per day at month ends, wish waiting, backup round trip.

## Acceptance

- Logging "85 TL Groceries" takes typing the amount and one tap; it appears in Spending and lowers Left to spend and Safe today at once.
- With a 24,900 TL income, 15,000 TL of fixed costs, 1,500 TL set aside and 8,000 TL of budgets, the month shows Unplanned 400 TL. After spending 2,000 TL by the 10th of a 31-day month, Safe today is (8,000 − 2,000) ÷ 22 = 272 TL.
- A $100 income in a month with USD at 49.7 counts as 4,970 TL; without any USD rate the month asks for one and leaves it out.
- Marking Rent paid creates a 12,000 TL expense from its wallet in that month; Rent no longer shows as due.
- A Spotify account at 59.99 TL a month appears in fixed costs without being typed in Money.
- Wallet balance = opening + income − expenses ± transfers ± adjustments; changing 100 USD into 4,950 TL moves 100 out of Wise and 4,950 into Ziraat.
- A wish added today can't be marked Bought before its wait ends (it says when); Bought records the expense and the pot shows bought.
- A rent due in 2 days and unpaid shows in Needs attention.
- Everything survives a backup and restore; a backup from before Money restores with Money empty.
- 375 px: no horizontal scroll; the category buttons wrap.

## Not Building

| Idea | Why not |
| --- | --- |
| Bank sync or statement import | Needs outside services and bank credentials; Hop holds neither. Maybe a CSV import later. |
| Live exchange rates | No outside services; one rate per month is enough for a monthly budget. |
| Card or account numbers | Like Accounts: labels only ("Ziraat card"). Hop refuses card-number shapes. |
| Investments, advice | Out of scope; Hop records, it doesn't advise. |
| Debts and loans, shared bills | Not asked for. Revisit if needed. |
| Receipt photos | Not needed to budget. |
