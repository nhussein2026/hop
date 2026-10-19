// Changes to accounts and subscriptions. Like actions.ts: cheap changes happen at once with Undo;
// the screen confirms deletes first.
import { useMemo } from 'react'
import type { Account, HopData } from '../lib/types.ts'
import { api, upsert, useHop, without } from './store.ts'

export type AccountFields = Omit<Account, 'id' | 'createdAt' | 'updatedAt'>

const applyAccount = (account: Account, data: HopData) => upsert(data, 'accounts', account)

export function useAccountActions() {
  const { commit } = useHop()

  return useMemo(() => ({
    add(fields: AccountFields) {
      return commit(`${fields.name} saved`, () => api.post<Account>('/api/accounts', fields), applyAccount)
    },
    update(a: Account, changes: Partial<AccountFields>, label: string, undo = false) {
      const before = Object.fromEntries(Object.keys(changes).map((key) => [key, a[key as keyof Account]])) as Partial<Account>
      return commit(label, () => api.patch<Account>(`/api/accounts/${a.id}`, changes), applyAccount, {
        undo: undo ? () => void commit('Undone', () => api.patch<Account>(`/api/accounts/${a.id}`, before), applyAccount) : undefined,
      })
    },
    remove(a: Account) {
      return commit(`${a.name} deleted`, () => api.delete(`/api/accounts/${a.id}`), (_, current) => without(current, 'accounts', a.id))
    },
  }), [commit])
}
