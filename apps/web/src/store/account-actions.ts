// Changes to accounts and subscriptions. Like actions.ts: cheap changes happen at once with Undo;
// the screen confirms deletes first.
import { useMemo } from 'react'
import type { Account, HopData, MoneyEntry } from '../lib/types.ts'
import { api, upsert, useHop, without } from './store.ts'

export type AccountFields = Omit<Account, 'id' | 'autoLoggedOn' | 'createdAt' | 'updatedAt'>

const applyAccount = (account: Account, data: HopData) => upsert(data, 'accounts', account)

/** A subscription charged to a wallet logs its charges by itself: catch up at once instead of within the hour. */
async function withLogged(saved: Account) {
  const logged = saved.walletId ? (await api.post<{ entries: MoneyEntry[] }>('/api/money/subscriptions/log')).entries : []
  return { saved, logged }
}
const applySaved = ({ saved, logged }: { saved: Account; logged: MoneyEntry[] }, data: HopData) => logged.reduce((next, entry) => upsert(next, 'moneyEntries', entry), applyAccount(saved, data))

export function useAccountActions() {
  const { commit } = useHop()

  return useMemo(() => ({
    add(fields: AccountFields) {
      return commit(`${fields.name} saved`, async () => withLogged(await api.post<Account>('/api/accounts', fields)), applySaved)
    },
    update(a: Account, changes: Partial<AccountFields>, label: string, undo = false) {
      const before = Object.fromEntries(Object.keys(changes).map((key) => [key, a[key as keyof Account]])) as Partial<Account>
      return commit(label, async () => withLogged(await api.patch<Account>(`/api/accounts/${a.id}`, changes)), applySaved, {
        undo: undo ? () => void commit('Undone', () => api.patch<Account>(`/api/accounts/${a.id}`, before), applyAccount) : undefined,
      })
    },
    remove(a: Account) {
      return commit(`${a.name} deleted`, () => api.delete(`/api/accounts/${a.id}`), (_, current) => without(current, 'accounts', a.id))
    },
  }), [commit])
}
