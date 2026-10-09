// The library: one place for notes, slides, past exams, papers, books, links and code, linked to a
// course or kept general, including things saved for courses you haven't taken yet.
import { useEffect, useState } from 'react'
import * as D from '../lib/dates.ts'
import { navigate } from '../lib/router.ts'
import type { Resource, ResourceKind } from '../lib/types.ts'
import { RESOURCE_KINDS, sizeLabel } from '../lib/labels.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon } from '../components/Icon.tsx'
import { Empty, Menu, RowFilter } from '../components/ui.tsx'
import { useConfirm } from '../components/confirm.tsx'
import { useHop } from '../store/store.ts'
import { useUniActions } from '../store/uni-actions.ts'

/** Where an item opens: notes in Hop, files from the Hop server, everything else at its link. */
const fileHref = (r: Resource) => `/api/resources/${r.id}/file`

export function ResourceRow({ resource: r, hideCourse, menu = true }: { resource: Resource; hideCourse?: boolean; menu?: boolean }) {
  const { data } = useHop()
  const editors = useEditors()
  const actions = useUniActions()
  const confirm = useConfirm()
  const [icon, label] = RESOURCE_KINDS[r.kind]
  const course = data.courses.find((c) => c.id === r.courseId)
  const later = course?.status === 'planned' ? ' (next term)' : course?.status === 'interested' ? ' (interested)' : ''
  const href = r.kind === 'note' ? null : r.file ? fileHref(r) : r.url

  async function remove() {
    const body = r.file ? `${r.title} and its file (${r.file.name}) are deleted from your Hop server.` : `${r.title} is deleted from your library.`
    if (await confirm({ title: 'Delete from library?', body, confirmLabel: 'Delete', tone: 'danger' })) void actions.library.remove(r)
  }

  return (
    <div className="row row-link">
      <span aria-hidden="true" className={`type-tile type-${r.kind}`}><Icon name={icon} /></span>
      <div className="row-main">
        {href
          ? <a className="row-open res-link" href={href} rel="noopener noreferrer" target="_blank">{r.title}<span className="visually-hidden"> (opens in a new tab)</span></a>
          : <button className="row-open" onClick={() => editors.editResource(r)} type="button">{r.title}</button>}
        <div className="row-meta">
          {!hideCourse && <span>{course ? `${course.code}${later}` : 'General'}</span>}
          <span>{label}</span>
          {r.file && <span><Icon name="folder" />{sizeLabel(r.file.size)}</span>}
          {r.file && r.url && <a href={r.url} rel="noopener noreferrer" target="_blank"><Icon name="link" />Link</a>}
          {r.source && <span>{r.source}</span>}
          <span>Added {D.relative(D.ymdOf(r.createdAt)).toLowerCase()}</span>
          {r.topics.map((topic) => <span className="tag tag-sm" key={topic}>{topic}</span>)}
        </div>
      </div>
      {menu && (
        <div className="row-actions">
          <Menu items={[
            { label: r.kind === 'note' ? 'Edit note' : 'Edit', icon: 'edit', onSelect: () => editors.editResource(r) },
            ...(r.file ? [{ label: 'Download file', icon: 'download', onSelect: () => { window.location.href = `${fileHref(r)}?download=1` } }] : []),
            { label: 'Move to course…', icon: 'school', onSelect: () => editors.moveResource(r) },
            '-',
            { label: 'Delete', icon: 'trash', onSelect: () => void remove(), danger: true },
          ]} label={`Actions for ${r.title}`} />
        </div>
      )}
    </div>
  )
}

type KindFilter = 'all' | 'note' | 'slides' | 'past-exam' | 'paper' | 'link'
const KIND_FILTERS: [KindFilter, string, ResourceKind[]][] = [
  ['all', 'All', []], ['note', 'Notes', ['note']], ['slides', 'Slides and files', ['slides', 'file']], ['past-exam', 'Past exams', ['past-exam']],
  ['paper', 'Papers and books', ['paper', 'book']], ['link', 'Links and code', ['link', 'video', 'repo']],
]

export function Library({ query }: { query: Record<string, string> }) {
  const { data } = useHop()
  const editors = useEditors()
  const [kind, setKind] = useState<KindFilter>('all')
  const [courseFilter, setCourseFilter] = useState('all')

  // Links such as #/itu/library?item=<id> open the item once, then drop the query.
  useEffect(() => {
    const r = query.item ? data.resources.find((x) => x.id === query.item) : undefined
    if (!query.item) return
    navigate('#/itu/library')
    if (r?.kind === 'note') editors.editResource(r)
    else if (r) window.open(r.file ? fileHref(r) : r.url ?? '', '_blank', 'noopener')
    // Open once per link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.item])

  if (!data.resources.length) return <Empty action={() => editors.resource()} actionLabel="Add resource" body="Slides, past exams, papers, notes and links. Link each to a course, or keep it general." title="Your library is empty" />

  const kinds = KIND_FILTERS.find(([key]) => key === kind)![2]
  const matchesCourse = (r: Resource) => {
    if (courseFilter === 'all') return true
    if (courseFilter === 'general') return !r.courseId
    if (courseFilter === 'later') return ['planned', 'interested'].includes(data.courses.find((c) => c.id === r.courseId)?.status ?? '')
    return r.courseId === courseFilter
  }
  const list = data.resources.filter((r) => (!kinds.length || kinds.includes(r.kind)) && matchesCourse(r)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const options: [string, string][] = [['all', 'All courses'], ['general', 'Not linked to a course'], ['later', 'Saved for later courses'], ...data.courses.map((c): [string, string] => [c.id, `${c.code} ${c.name}`])]

  return (
    <>
      <div className="toolbar">
        <div aria-label="Type" className="chips" role="group">
          {KIND_FILTERS.map(([key, label]) => <button aria-pressed={kind === key} className="chip" key={key} onClick={() => setKind(key)} type="button">{label}</button>)}
        </div>
      </div>
      <div className="toolbar">
        <div className="field field-inline">
          <label className="visually-hidden" htmlFor="lib-course">Course</label>
          <select className="select" id="lib-course" onChange={(event) => setCourseFilter(event.target.value)} value={courseFilter}>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </div>
        <RowFilter id="lib-search" label="Filter the library" placeholder="Title, topic or source" target="#lib-list" />
      </div>
      {list.length
        ? <><div className="rows" id="lib-list">{list.map((r) => <ResourceRow key={r.id} resource={r} />)}</div><p className="small muted filter-empty" hidden>Nothing matches that filter.</p></>
        : <p className="small muted">Nothing here with these filters. <button className="link-btn" onClick={() => { setKind('all'); setCourseFilter('all') }} type="button">Show everything</button></p>}
    </>
  )
}
