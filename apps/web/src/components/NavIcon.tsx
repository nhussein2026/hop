// Simple line icons for the primary navigation. They sit next to visible labels, so they are decorative.
const paths: Record<string, string> = {
  Today: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  Plan: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  Goals: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 12h.01',
  Career: 'M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M4 8h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1ZM3 13h18',
  Growth: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  Review: 'M4 4v6h6M4.5 15a8 8 0 1 0 1.9-8.3L4 10',
}

export function NavIcon({ name }: { name: string }) {
  return <svg aria-hidden="true" className="nav-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24"><path d={paths[name]} /></svg>
}
