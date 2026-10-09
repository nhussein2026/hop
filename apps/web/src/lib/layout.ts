import { useSyncExternalStore } from 'react'

export const SETTINGS_SECTIONS: [string, string, string][] = [
  ['profile', 'Profile', 'user'],
  ['appearance', 'Appearance', 'sun'],
  ['notifications', 'Notifications', 'bell'],
  ['career', 'Career rules', 'career'],
  ['university', 'University', 'school'],
  ['data', 'Backup and export', 'database'],
  ['security', 'Privacy and security', 'shield'],
]

const phoneQuery = window.matchMedia('(max-width: 699px)')
const subscribePhone = (onChange: () => void) => { phoneQuery.addEventListener('change', onChange); return () => phoneQuery.removeEventListener('change', onChange) }
export const useIsPhone = () => useSyncExternalStore(subscribePhone, () => phoneQuery.matches)

export function settingsTitle(section: string | undefined, phone: boolean) {
  if (phone && !section) return 'Settings'
  return (SETTINGS_SECTIONS.find(([key]) => key === section) ?? SETTINGS_SECTIONS[0]!)[1]
}

const ZONES = ['Europe/Istanbul', 'Europe/London', 'Europe/Berlin', 'Asia/Dubai', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'UTC']

export function timezoneOptions(current: string) {
  return [...new Set([current, Intl.DateTimeFormat().resolvedOptions().timeZone, ...ZONES])].filter(Boolean)
}

