export type AgendaItem = {
  id: string
  title: string
  date: string
  time: string | null
  type: string
  source: 'event' | 'opportunity' | 'review'
}