// Radar: saving a find. Paste a link and Hop recognises GitHub, Hugging Face, arXiv and İTÜ pages.
import { useRef, useState } from 'react'
import { detectLink, splitList } from '../lib/uni.ts'
import type { DetectedLink } from '../lib/uni.ts'
import type { FindKind } from '../lib/types.ts'
import { FIND_KINDS } from '../lib/labels.ts'
import { useUniActions } from '../store/uni-actions.ts'
import { Icon } from '../components/Icon.tsx'
import { Dialog, Field, SubmitButton } from '../components/ui.tsx'
import { useHop } from '../store/store.ts'
import { closeDialog, focusFirstInvalid, formText } from '../components/ui-context.ts'

type Errors = Record<string, string>
const KIND_OPTIONS = Object.entries(FIND_KINDS).map(([kind, [, label]]): [string, string] => [kind, label])

export function FindEditor({ close }: { close: () => void }) {
  const { data } = useHop()
  const actions = useUniActions()
  const [errors, setErrors] = useState<Errors>({})
  const [detected, setDetected] = useState<DetectedLink | null>(null)
  const [kind, setKind] = useState<FindKind>('repo')
  const autoTitle = useRef('')
  const topics = [...new Set(data.finds.flatMap((f) => f.topics))].sort()

  function onUrl(form: HTMLFormElement, value: string) {
    const found = detectLink(value)
    setDetected(found)
    if (!found) return
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
    const duplicate = url ? data.finds.find((f) => f.url && f.url.replace(/\/+$/, '') === url.replace(/\/+$/, '')) : undefined
    if (duplicate) next.url = `Already on your radar (${duplicate.status === 'inbox' ? 'in the inbox' : duplicate.status}).`
    if (!title) next.title = 'Add a title.'
    if (!why) next.why = 'Write one line on why it matters. Future you will thank you.'
    setErrors(next)
    if (Object.keys(next).length) return focusFirstInvalid(form)
    const saved = await actions.radar.add({
      kind,
      title,
      url,
      source: formText(form, 'source'),
      why,
      topics: [...new Set([...fd.getAll('topics').map(String), ...splitList(formText(form, 'newTopics'))])],
      eventDate: kind === 'event' ? String(fd.get('eventDate') || '') || null : null,
    })
    if (saved) closeDialog(form)
  }

  return (
    <Dialog
      desc="Paste a link. Hop recognises GitHub, Hugging Face, arXiv and İTÜ pages."
      foot={<><span className="xs muted hide-phone">Lands in your Radar inbox</span><span className="spacer" /><button className="btn" data-close type="button">Cancel</button><SubmitButton>Save find</SubmitButton></>}
      onClose={close}
      onSubmit={submit}
      title="Save a find"
    >
      <div className="form-grid">
        <div className="field">
          <label htmlFor="fd-url">Link <span className="optional">(optional)</span></label>
          <input aria-describedby="fd-url-hint" aria-invalid={errors.url ? true : undefined} className="input" id="fd-url" name="url" onInput={(event) => onUrl(event.currentTarget.form!, event.currentTarget.value)} placeholder="https://github.com/…" type="url" />
          <span className="field-hint" id="fd-url-hint">Leave empty for something without a link, like a talk you heard about.</span>
          {errors.url && <span className="field-error"><Icon className="icon-sm" name="alertCircle" />{errors.url}</span>}
        </div>
        <div aria-live="polite" className="detect">{detected && <span className="badge badge-primary"><Icon name={FIND_KINDS[detected.kind][0]} />{FIND_KINDS[detected.kind][1]} from {detected.source}</span>}</div>
        <Field error={errors.title} label="Title" name="title" required />
        <div className="form-row">
          <div className="field">
            <label htmlFor="fd-kind">Type</label>
            <select className="select" id="fd-kind" name="kind" onChange={(event) => setKind(event.target.value as FindKind)} value={kind}>{KIND_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </div>
          <Field label="Source" name="source" placeholder="GitHub, Department, a friend…" />
        </div>
        {kind === 'event' && <Field label="When is it?" name="eventDate" optional type="date" />}
        <Field error={errors.why} hint="This line is what makes a find useful when you come back to it." label="Why does it matter to you?" name="why" placeholder="One line. e.g. “Could be the baseline for my thesis idea.”" rows={2} type="textarea" />
        <fieldset className="field">
          <legend className="field-label">Topics</legend>
          {topics.length > 0 && <div className="check-chips">{topics.map((topic) => <label className="check-chip" key={topic}><input name="topics" type="checkbox" value={topic} /><span>{topic}</span></label>)}</div>}
          <label className="visually-hidden" htmlFor="fd-newtopics">New topics</label>
          <input className="input" id="fd-newtopics" name="newTopics" placeholder="New topics, comma separated" style={{ marginTop: 6 }} />
        </fieldset>
      </div>
    </Dialog>
  )
}
