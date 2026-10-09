import type { Program } from './university.js';

export const THEMES = ['system', 'light', 'dark'] as const;

export type Theme = (typeof THEMES)[number];

/** Weekdays a week may start on: Sunday, Monday or Saturday. */
const WEEK_STARTS = [0, 1, 6] as const;

export type WeekStart = (typeof WEEK_STARTS)[number];

export interface NotificationPreferences {
  /** Interview within 24 hours, deadline today, offer awaiting a response. */
  critical: boolean;
  /** Deadline in 2 days, overdue follow-up, weekly review due. */
  important: boolean;
  /** Habit reminders, a goal with no activity for 2 weeks. */
  optional: boolean;
}

export interface Settings {
  name: string;
  /** IANA timezone. "Today" follows this, not the server clock. */
  timezone: string;
  weekStart: WeekStart;
  theme: Theme;
  /** Suggest a follow-up after this many quiet days on an application. */
  followUpDays: number;
  notify: NotificationPreferences;
  workHours: string;
  /** False until first-run onboarding is finished. */
  onboarded: boolean;
  /** Notifications already seen, by key. */
  readNotifications: string[];
  program: Program;
}

export type UpdateSettingsInput = Partial<Omit<Settings, 'notify' | 'program'>> & { notify?: Partial<NotificationPreferences>; program?: Partial<Program> };
