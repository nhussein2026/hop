import type { Settings, UpdateSettingsInput } from '@hop/domain';

import { db } from '../db/client.js';
import { goals, tasks } from '../db/schema/index.js';
import { settingsRepository } from '../repositories/settings.repository.js';

const defaults: Settings = {
  name: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  weekStart: 1,
  theme: 'system',
  followUpDays: 10,
  notify: { critical: true, important: true, optional: false },
  workHours: '',
  onboarded: false,
  readNotifications: [],
};

function stored(): Settings {
  const row = settingsRepository.read() as (Partial<Settings> & { calendarToken?: string }) | undefined;

  if (!row) {
    // Workspaces created before onboarding existed already have data, so they skip it.
    const hasData = db.select({ id: goals.id }).from(goals).limit(1).get() || db.select({ id: tasks.id }).from(tasks).limit(1).get();
    return { ...defaults, onboarded: Boolean(hasData) };
  }

  // calendarToken belonged to the old calendar feed, which the in-app calendar replaced.
  const { calendarToken: _retired, ...saved } = row;
  return { ...defaults, ...saved, notify: { ...defaults.notify, ...saved.notify } };
}

function save(next: Settings) {
  settingsRepository.write(next as unknown as Record<string, unknown>, new Date().toISOString());
}

export const settingsService = {
  get(): Settings {
    return stored();
  },

  update(input: UpdateSettingsInput): Settings {
    const current = stored();
    save({ ...current, ...input, notify: { ...current.notify, ...input.notify } });
    return this.get();
  },

  /** The local calendar date (YYYY-MM-DD) in the user's timezone. Never the UTC date. */
  today(now = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: this.get().timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  },

};
