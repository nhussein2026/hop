// One place to open any dialog, so screens and rows don't import each other's editors.
import { useMemo } from 'react'
import * as D from '../lib/dates.ts'
import type { Assessment, Contact, Course, Goal, Habit, Idea, Opportunity, OpportunityStage, Pin, Program, Project, Resource, ResourceKind, Resume, Skill, Task, Term } from '../lib/types.ts'
import { CloseOpportunity, ContactDrawer, ContactEditor, LogActivity, OpportunityEditor, ResumeEditor } from './career.tsx'
import { MoreSheet, Notifications, QuickAdd, ReflectionEditor, Search } from './global.tsx'
import type { AddKind } from './global.tsx'
import { EvidenceEditor, MilestoneEditor, ProjectDrawer, ProjectEditor, SkillDrawer, SkillEditor } from './growth.tsx'
import { EventEditor, GoalEditor, HabitEditor, TaskEditor } from './planning.tsx'
import { FindEditor } from './radar.tsx'
import { AdvisorPicker, AssessmentEditor, CompleteCourse, CourseEditor, IdeaDrawer, IdeaEditor, KeyDateEditor, MoveResource, NoteDrawer, PinEditor, PlaybookEditor, ResourceEditor, TermEditor, UniLinkEditor } from './uni.tsx'
import { useDialogs } from '../components/ui-context.ts'
import { celebrate } from '../lib/notifications.ts'

export function useEditors() {
  const { open } = useDialogs()

  return useMemo(() => {
    const editors = {
      task: (task?: Task | null, defaults?: Partial<Task>) => open((close) => <TaskEditor close={close} defaults={defaults} task={task} />),
      habit: (habit?: Habit | null) => open((close) => <HabitEditor close={close} habit={habit} />),
      goal: (goal?: Goal | null) => open((close) => <GoalEditor close={close} goal={goal} />),
      event: (date?: string) => open((close) => <EventEditor close={close} date={date} />),
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
      evidence: (defaults: { skillId?: string; projectId?: string; goalId?: string } = {}) => open((close) => <EvidenceEditor close={close} {...defaults} />),
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
      find: () => open((close) => <FindEditor close={close} />),
      search: () => open((close) => <Search close={close} />),
      notifications: () => open((close) => <Notifications close={close} />),
      more: (counts: Record<string, number> = {}) => open((close) => <MoreSheet close={close} counts={counts} />),
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
        idea: () => editors.idea(),
      }
      map[kind]()
      return () => undefined
    }

    return editors
  }, [open])
}
