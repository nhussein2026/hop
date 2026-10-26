// The starter daily plan for a language track: about three hours on an ideal day (Monday to
// Saturday) and a lighter Sunday, built around the commute. Listening and reading fill the bus and
// train; speaking and writing, which need a voice and a desk, happen at home. Every skill gets time
// every week, so none falls behind before the exam. Everything here can be edited in the app.
import type { CreatePracticeActivityInput } from '@hop/domain';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const MON_SAT = [1, 2, 3, 4, 5, 6];
const MON_FRI = [1, 2, 3, 4, 5];

export const STARTER_PLAN: Required<Omit<CreatePracticeActivityInput, 'position' | 'active' | 'tier'>>[] = [
  {
    area: 'words', title: 'Anki: reviews, then new words', minutes: 20, slot: 'commute', days: EVERY_DAY,
    detail: 'Finish all reviews first, then add 10 to 15 new cards. Start from a deck of the most frequent Turkish words and add words from class and from your book. Many Turkish words come from Arabic (kitap, fikir, hayat): link each one to the Arabic you already know.',
  },
  {
    area: 'listening', title: 'Learner podcast or video, heard twice', minutes: 25, slot: 'commute', days: MON_SAT,
    detail: 'Intensive listening. The first time for the main idea; the second time with the transcript or subtitles, going back over what you missed. A2 to B1: material made for learners, such as Easy Turkish. From B2: news and talk shows, such as TRT Haber.',
  },
  {
    area: 'reading', title: 'Your Turkish book', minutes: 30, slot: 'commute', days: MON_SAT,
    detail: 'Extensive reading: keep going and guess from context instead of stopping at every word. A2 to B1: graded readers. From B1: a Turkish book from your Reading shelf, computer engineering ones included. Log the pages there.',
  },
  {
    area: 'reading', title: 'One news article, read closely', minutes: 10, slot: 'commute', days: MON_FRI,
    detail: 'Intensive reading: one short article. Look up only the words that block the meaning, and put the five most useful into Anki.',
  },
  {
    area: 'listening', title: 'Turkish audio, no pausing', minutes: 30, slot: 'commute', days: MON_SAT,
    detail: 'Listening for volume, on the way home: a series, podcast or channel you enjoy. Don’t pause or rewind; follow what you can. Understanding grows with hours, not with perfect episodes.',
  },
  {
    area: 'speaking', title: 'Shadowing', minutes: 15, slot: 'home', days: MON_SAT,
    detail: 'Play a minute or two of today’s podcast and repeat each sentence aloud right after the speaker, copying the rhythm, stress and vowel harmony. Repeat until it’s easy, then move on.',
  },
  {
    area: 'writing', title: 'Write, then get it corrected', minutes: 30, slot: 'home', days: MON_FRI,
    detail: 'A2: 80 to 100 words on an everyday topic. B1: 150 words. From B2: a 250-word opinion essay like the exam’s. Write without a dictionary, then get it corrected (teacher, partner or a tool) and copy mistakes you repeat into your Türkçe mistakes note.',
  },
  {
    area: 'speaking', title: 'Talk for two minutes and record it', minutes: 20, slot: 'home', days: [1, 3, 5],
    detail: 'Pick an exam-style topic: your city, your studies, a problem and how to solve it. Speak for two minutes without notes, listen back, note three mistakes, then record it again.',
  },
  {
    area: 'speaking', title: 'Conversation in Turkish', minutes: 20, slot: 'any', days: [2, 4, 6],
    detail: 'With a classmate, a language-exchange partner (Tandem or HelloTalk) or a tutor. Only Turkish. Ask them to correct one or two mistakes each time.',
  },
  {
    area: 'writing', title: 'Timed essay, exam conditions', minutes: 40, slot: 'home', days: [6],
    detail: 'Like the exam’s writing section: one topic, no dictionary, a timer on. From B2, take the full 60 minutes the exam gives. Compare it with last week’s essay.',
  },
  {
    area: 'listening', title: 'A series or film with Turkish subtitles', minutes: 45, slot: 'any', days: [0],
    detail: 'Something you enjoy, with Turkish subtitles, not English or Arabic ones. Note two or three phrases people really say.',
  },
  {
    area: 'words', title: 'Review your mistakes and plan the week', minutes: 20, slot: 'home', days: [0],
    detail: 'Read your mistakes note and the week’s corrections, and turn mistakes you keep making into Anki cards. Then look at this week’s balance and move time toward the skill that fell behind.',
  },
];

/** The note the plan's writing and Sunday review refer to. Created once, pinned at the top of Notes. */
export const MISTAKES_NOTE = {
  title: 'Türkçe: mistakes I keep making',
  topics: ['Türkçe'],
  body: [
    'One line per mistake: what you wrote or said, then the correct form. Add what teachers and partners correct.',
    'Review this note on Sundays; mistakes that keep coming back become Anki cards.',
    '',
    'Wrong: Ben okula gidiyorum dün.',
    'Right: Dün okula gittim.',
  ].join('\n'),
};
