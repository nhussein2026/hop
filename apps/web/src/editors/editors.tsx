// One place to open any dialog, so screens and rows don't import each other's editors.
import { useMemo } from 'react'
import * as D from '../lib/dates.ts'
import type { Contact, Goal, Habit, Opportunity, OpportunityStage, Project, Resume, Skill, Task } from '../lib/types.ts'
import { CloseOpportunity, ContactDrawer, ContactEditor, LogActivity, OpportunityEditor, ResumeEditor } from './career.tsx'
import { MoreSheet, Notifications, QuickAdd, ReflectionEditor, Search } from './global.tsx'
import type { AddKind } from './global.tsx'
import { EvidenceEditor, MilestoneEditor, ProjectDrawer, ProjectEditor, SkillDrawer, SkillEditor } from './growth.tsx'
import { EventEditor, GoalEditor, HabitEditor, TaskEditor } from './planning.tsx'
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
      search: () => open((close) => <Search close={close} />),
      notifications: () => open((close) => <Notifications close={close} />),
      more: () => open((close) => <MoreSheet close={close} />),
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
      }
      map[kind]()
      return () => undefined
    }

    return editors
  }, [open])
}
