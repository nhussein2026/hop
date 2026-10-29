// One place to open any dialog, so screens and rows don't import each other's editors.
import { useMemo } from 'react'
import * as D from '../lib/dates.ts'
import type { FixedCost } from '../lib/money.ts'
import type { Account, Assessment, Book, BookLoan, Contact, Event, Find, LanguageCheck, PracticeActivity, PracticeArea, PracticeSession, PracticeTest, Course, Evidence, Goal, Habit, Idea, IncomeSource, Bill, MoneyEntry, Opportunity, OpportunityStage, Pin, Pot, PotKind, Program, Project, Resource, ResourceKind, Resume, Skill, Task, Term, Wallet } from '../lib/types.ts'
import { CloseOpportunity, ContactDrawer, ContactEditor, LogActivity, OpportunityEditor, ResumeEditor } from './career.tsx'
import { MoreSheet, Notifications, QuickAdd, ReflectionEditor, Search } from './global.tsx'
import type { AddKind } from './global.tsx'
import { EvidenceEditor, MilestoneEditor, ProjectDrawer, ProjectEditor, SkillDrawer, SkillEditor } from './growth.tsx'
import type { EvidenceDefaults } from './growth.tsx'
import { EventEditor, GoalEditor, HabitEditor, LogHabit, TaskEditor } from './planning.tsx'
import { FindEditor } from './radar.tsx'
import { AccountEditor, NoteEditor } from './notes.tsx'
import { BillEditor, BudgetsEditor, BuyWish, EntryEditor, IncomeEditor, LogSpending, MatchBalance, PayCost, PotEditor, PutAside, RatesEditor, ReceiveIncome, TransferEditor, WalletEditor } from './money.tsx'
import { ActivityEditor, LogPractice, SessionEditor, CheckEditor, SetupTrack, TestEditor, TrackEditor } from './practice.tsx'
import { BookDrawer, BookEditor, FinishBook, LoanEditor, LogPages, RenewLoan } from './reading.tsx'
import { AdvisorPicker, AssessmentEditor, CompleteCourse, CourseEditor, IdeaDrawer, IdeaEditor, KeyDateEditor, MoveResource, NoteDrawer, PinEditor, PlaybookEditor, ResourceEditor, TermEditor, UniLinkEditor } from './uni.tsx'
import { useDialogs } from '../components/ui-context.ts'
import { celebrate } from '../lib/notifications.ts'

export function useEditors() {
  const { open } = useDialogs()

  return useMemo(() => {
    const editors = {
      task: (task?: Task | null, defaults?: Partial<Task>) => open((close) => <TaskEditor close={close} defaults={defaults} task={task} />),
      habit: (habit?: Habit | null) => open((close) => <HabitEditor close={close} habit={habit} />),
      logHabit: (habit: Habit) => open((close) => <LogHabit close={close} habit={habit} />),
      goal: (goal?: Goal | null) => open((close) => <GoalEditor close={close} goal={goal} />),
      event: (date?: string) => open((close) => <EventEditor close={close} date={date} />),
      editEvent: (event: Event, occurrence?: string) => open((close) => <EventEditor close={close} event={event} occurrence={occurrence} />),
      opportunity: (opportunity?: Opportunity | null) => open((close) => <OpportunityEditor close={close} opportunity={opportunity} />),
      closeOpportunity: (opportunity: Opportunity) => open((close) => <CloseOpportunity close={close} onClosed={(outcome: OpportunityStage) => { if (outcome === 'accepted') celebrate() }} opportunity={opportunity} />),
      logActivity: (opportunity: Opportunity) => open((close) => <LogActivity close={close} opportunity={opportunity} />),
      contact: () => open((close) => <ContactEditor close={close} />),
      contactDrawer: (contact: Contact) => open((close) => <ContactDrawer close={close} contact={contact} />),
      resume: (resume?: Resume | null) => open((close) => <ResumeEditor close={close} resume={resume} />),
      skill: () => open((close) => <SkillEditor close={close} />),
      skillDrawer: (skill: Skill) => open((close) => <SkillDrawer close={close} skill={skill} />),
      project: () => open((close) => <ProjectEditor close={close} />),
      projectDrawer: (project: Project) => open((close) => <ProjectDrawer close={close} project={project} />),
      evidence: (defaults: EvidenceDefaults = {}) => open((close) => <EvidenceEditor close={close} defaults={defaults} />),
      editEvidence: (evidence: Evidence) => open((close) => <EvidenceEditor close={close} evidence={evidence} />),
      milestone: (goalId?: string) => open((close) => <MilestoneEditor close={close} goalId={goalId} />),
      reflection: (date = D.today()) => open((close) => <ReflectionEditor close={close} date={date} />),
      term: (term?: Term | null) => open((close) => <TermEditor close={close} term={term} />),
      course: (course?: Course | null) => open((close) => <CourseEditor close={close} course={course} />),
      completeCourse: (course: Course) => open((close) => <CompleteCourse close={close} course={course} />),
      assessment: (course?: Course | null, item?: Assessment | null) => open((close) => <AssessmentEditor close={close} course={course} item={item} />),
      playbook: (contact: Contact) => open((close) => <PlaybookEditor close={close} contact={contact} />),
      resource: (defaults: { kind?: ResourceKind; courseId?: string; title?: string; url?: string; topics?: string[] } = {}) => open((close) => <ResourceEditor close={close} defaults={defaults} />),
      editResource: (resource: Resource) => open((close) => (resource.kind === 'note' ? <NoteDrawer close={close} resource={resource} /> : <ResourceEditor close={close} resource={resource} />)),
      moveResource: (resource: Resource) => open((close) => <MoveResource close={close} resource={resource} />),
      idea: (defaults: Partial<Idea> = {}) => open((close) => <IdeaEditor close={close} defaults={defaults} />),
      ideaDrawer: (idea: Idea) => open((close) => <IdeaDrawer close={close} idea={idea} />),
      advisor: (program: Program) => open((close) => <AdvisorPicker close={close} program={program} />),
      keyDate: () => open((close) => <KeyDateEditor close={close} />),
      pin: (pin?: Pin | null) => open((close) => <PinEditor close={close} pin={pin} />),
      uniLink: () => open((close) => <UniLinkEditor close={close} />),
      find: (find?: Find | null) => open((close) => <FindEditor close={close} find={find} />),
      book: (defaults: Partial<Book> = {}) => open((close) => <BookEditor close={close} defaults={defaults} />),
      editBook: (book: Book) => open((close) => <BookEditor book={book} close={close} />),
      bookDrawer: (book: Book) => open((close) => <BookDrawer book={book} close={close} />),
      logPages: (book: Book) => open((close) => <LogPages book={book} close={close} />),
      borrow: (book: Book, loan?: BookLoan) => open((close) => <LoanEditor book={book} close={close} loan={loan} />),
      renew: (book: Book, loan: BookLoan) => open((close) => <RenewLoan book={book} close={close} loan={loan} />),
      finishBook: (book: Book) => open((close) => <FinishBook book={book} close={close} />),
      note: (topics?: string[]) => open((close) => <NoteEditor close={close} topics={topics} />),
      account: (account?: Account | null) => open((close) => <AccountEditor account={account} close={close} />),
      logSpending: () => open((close) => <LogSpending close={close} />),
      entry: (entry: MoneyEntry) => open((close) => <EntryEditor close={close} entry={entry} />),
      wallet: (wallet?: Wallet | null) => open((close) => <WalletEditor close={close} wallet={wallet} />),
      transfer: (from?: Wallet) => open((close) => <TransferEditor close={close} from={from} />),
      matchBalance: (wallet: Wallet) => open((close) => <MatchBalance close={close} wallet={wallet} />),
      income: (source?: IncomeSource | null) => open((close) => <IncomeEditor close={close} source={source} />),
      receiveIncome: (source?: IncomeSource | null) => open((close) => <ReceiveIncome close={close} source={source} />),
      bill: (bill?: Bill | null) => open((close) => <BillEditor bill={bill} close={close} />),
      payCost: (cost: FixedCost) => open((close) => <PayCost close={close} cost={cost} />),
      budgets: () => open((close) => <BudgetsEditor close={close} />),
      pot: (pot?: Pot | null, kind?: PotKind) => open((close) => <PotEditor close={close} kind={kind} pot={pot} />),
      putAside: (pot: Pot) => open((close) => <PutAside close={close} pot={pot} />),
      buyWish: (pot: Pot) => open((close) => <BuyWish close={close} pot={pot} />),
      rates: (month: string) => open((close) => <RatesEditor close={close} month={month} />),
      setupTrack: () => open((close) => <SetupTrack close={close} />),
      editTrack: () => open((close) => <TrackEditor close={close} />),
      practiceActivity: (activity?: PracticeActivity | null) => open((close) => <ActivityEditor activity={activity} close={close} />),
      logPractice: (area?: PracticeArea) => open((close) => <LogPractice area={area} close={close} />),
      practiceSession: (session: PracticeSession, title: string) => open((close) => <SessionEditor close={close} session={session} title={title} />),
      practiceTest: (test?: PracticeTest | null) => open((close) => <TestEditor close={close} test={test} />),
      languageCheck: (check?: LanguageCheck | null) => open((close) => <CheckEditor check={check} close={close} />),
      search: () => open((close) => <Search close={close} />),
      notifications: () => open((close) => <Notifications close={close} />),
      more: (counts: Record<string, number> = {}, extra?: 'itu' | 'turkish') => open((close) => <MoreSheet close={close} counts={counts} extra={extra} />),
      add: (kind?: AddKind) => {
        if (kind) return switchTo(kind)
        return open((close) => <QuickAdd close={close} onSwitch={switchTo} />)
      },
    }

    function switchTo(kind: AddKind) {
      const map: Record<AddKind, () => void> = {
        opportunity: () => editors.opportunity(),
        goal: () => editors.goal(),
        evidence: () => editors.evidence(),
        project: () => editors.project(),
        milestone: () => editors.milestone(),
        note: () => editors.reflection(),
        event: () => editors.event(),
        deadline: () => editors.assessment(),
        resource: () => editors.resource(),
        find: () => editors.find(),
        book: () => editors.book(),
        memo: () => editors.note(),
        account: () => editors.account(),
        spending: () => editors.logSpending(),
        wish: () => editors.pot(null, 'wish'),
        idea: () => editors.idea(),
      }
      map[kind]()
      return () => undefined
    }

    return editors
  }, [open])
}
