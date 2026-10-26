// Radar: saving and editing a find. Paste a link and Hop recognises GitHub, Hugging Face, arXiv and İTÜ pages.
import { useRef, useState } from 'react'
import { detectLink, splitList } from '../lib/uni.ts'
import type { DetectedLink } from '../lib/uni.ts'
import type { Find, FindKind, Language } from '../lib/types.ts'
import { FIND_KINDS, FIND_STATUS_LABEL, LANGUAGE_OPTIONS } from '../lib/labels.ts'
import { useUniActions } from '../store/uni-actions.ts'
import { Icon } from '../components/Icon.tsx'
import { Dialog, Field, SubmitButton } from '../components/ui.tsx'
import { useHop } from '../store/store.ts'
import { closeDialog, focusFirstInvalid, formText } from '../components/ui-context.ts'

type Errors = Record<string, string>
type Place = 'inbox' | 'explore'
const KIND_OPTIONS = Object.entries(FIND_KINDS).map(([kind, [, label]]): [string, string] => [kind, label])
const PLACE_OPTIONS: [Place, string][] = [['inbox', 'Inbox: decide soon'], ['explore', 'To explore: curious, no rush']]

export function FindEditor({ find, close }: { find?: Find | null; close: () => void }) {
  const { data } = useHop()
  const actions = useUniActions()
  const [errors, setErrors] = useState<Errors>({})
  const [detected, setDetected] = useState<DetectedLink | null>(null)
  const [kind, setKind] = useState<FindKind>(find?.kind ?? 'repo')
  const [place, setPlace] = useState<Place>('inbox')
  const autoTitle = useRef('')
  const topics = [...new Set([...data.finds.flatMap((f) => f.topics)])].sort()
  const lastLanguage = [...data.finds].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.language

  /** A new find takes its type, source and title from the link. An edited find keeps what was chosen. */
  function onUrl(form: HTMLFormElement, value: string) {
    const found = detectLink(value)
    setDetected(found)
    if (!found || find) return
    setKind(found.kind)
    const source = form.elements.namedItem('source') as HTMLInputElement
    const title = form.elements.namedItem('title') as HTMLInputElement
    source.value = found.source
    if (found.title && (!title.value || title.value === autoTitle.current)) title.value = autoTitle.current = found.title
  }

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const url = formText(form, 'url')
    const title = formText(form, 'title')
    const why = formText(form, 'why')
    const next: Errors = {}
    if (url && !detectLink(url)) next.url = 'That doesn’t look like a web link. Start with https://'
    const duplicate = url ? data.finds.find((f) => f.id !== find?.id && f.url && f.url.replace(/\/+$/, '') === url.replace(/\/+$/, '')) : undefined
    if (duplicate) next.url = `Already on your radar (${duplicate.status === 'inbox' ? 'in the inbox' : `in “${FIND_STATUS_LABEL[duplicate.status]}”`}).`
    if (!title) next.title = 'Add a title.'
    if (!why) next.why = 'Write one line on why it matters. Future you will thank you.'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const fields = {
      kind,
      title,
      url,
      source: formText(form, 'source'),
      why,
      topics: [...new Set([...fd.getAll('topics').map(String), ...splitList(formText(form, 'newTopics'))])],
      eventDate: kind === 'event' ? String(fd.get('eventDate') || '') || null : null,
      language: (String(fd.get('language') || '') || null) as Language | null,
    }
    const saved = find
      ? await actions.radar.update(find, { ...fields, url: url || null, source: fields.source || 'Web' }, 'Find updated')
      : await actions.radar.add({ ...fields, status: place })
    if (saved) closeDialog(form)
  }

  return (
    <Dialog
      desc={find ? undefined : 'Paste a link. Hop recognises GitHub, Hugging Face, arXiv and İTÜ pages.'}
      foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>{find ? 'Save' : 'Save find'}</SubmitButton></>}
      onClose={close}
      onSubmit={submit}
      title={find ? 'Edit find' : 'Save a find'}
    >
      <div className="form-grid">
        <div className="field">
          <label htmlFor="fd-url">Link <span className="optional">(optional)</span></label>
          <input aria-describedby="fd-url-hint" aria-invalid={errors.url ? true : undefined} className="input" defaultValue={find?.url ?? ''} id="fd-url" name="url" onInput={(event) => onUrl(event.currentTarget.form!, event.currentTarget.value)} placeholder="https://github.com/…" type="url" />
          <span className="field-hint" id="fd-url-hint">Leave empty for something without a link, like a talk you heard about.</span>
          {errors.url && <span className="field-error"><Icon className="icon-sm" name="alertCircle" />{errors.url}</span>}
        </div>
        <div aria-live="polite" className="detect">{detected && <span className="badge badge-primary"><Icon name={FIND_KINDS[detected.kind][0]} />{FIND_KINDS[detected.kind][1]} from {detected.source}</span>}</div>
        <Field defaultValue={find?.title} error={errors.title} label="Title" name="title" required />
        <div className="form-row">
          <div className="field">
            <label htmlFor="fd-kind">Type</label>
            <select className="select" id="fd-kind" name="kind" onChange={(event) => setKind(event.target.value as FindKind)} value={kind}>{KIND_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </div>
          <Field defaultValue={find?.source} label="Source" name="source" placeholder="GitHub, Department, a friend…" />
        </div>
        <div className="form-row">
          <Field defaultValue={(find ? find.language : lastLanguage) ?? ''} label="Language" name="language" options={[['', 'Not set'], ...LANGUAGE_OPTIONS]} type="select" />
          {kind === 'event' && <Field defaultValue={find?.eventDate ?? ''} label="When is it?" name="eventDate" optional type="date" />}
        </div>
        <Field defaultValue={find?.why} error={errors.why} hint="This line is what makes a find useful when you come back to it." label="Why does it matter to you?" name="why" placeholder="One line. e.g. “Could be the baseline for my thesis idea.”" rows={2} type="textarea" />
        <fieldset className="field">
          <legend className="field-label">Topics</legend>
          {topics.length > 0 && <div className="check-chips">{topics.map((topic) => <label className="check-chip" key={topic}><input defaultChecked={find?.topics.includes(topic)} name="topics" type="checkbox" value={topic} /><span>{topic}</span></label>)}</div>}
          <label className="visually-hidden" htmlFor="fd-newtopics">New topics</label>
          <input className="input" id="fd-newtopics" name="newTopics" placeholder="New topics, comma separated" style={{ marginTop: 6 }} />
        </fieldset>
        {!find && <Field hint="To explore is for things you're curious about but unsure deserve a try. They never go stale." label="Put it in" name="place" onChange={(value) => setPlace(value as Place)} options={PLACE_OPTIONS} type="select" />}
      </div>
    </Dialog>
  )
}
