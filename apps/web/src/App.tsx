import { useState } from 'react'
import './App.css'
import { useEvidence } from './hooks/useEvidence.js'
import { useEvents } from './hooks/useEvents.js'
import { useGoals } from './hooks/useGoals.js'
import { useHabits } from './hooks/useHabits.js'
import { useOpportunities } from './hooks/useOpportunities.js'
import { useProjects } from './hooks/useProjects.js'
import { useSkills } from './hooks/useSkills.js'
import { useTasks } from './hooks/useTasks.js'
import { useWeeklyReviews } from './hooks/useWeeklyReviews.js'
import { OfflineBanner } from './components/OfflineBanner.js'
import { toLocalDate } from './lib/date.js'
import { CareerView } from './views/CareerView.js'
import { GoalsView } from './views/GoalsView.js'
import { GrowthView } from './views/GrowthView.js'
import { PlanView } from './views/PlanView.js'
import { ReviewView } from './views/ReviewView.js'
import { TodayView } from './views/TodayView.js'

const navigation = ['Today', 'Plan', 'Goals', 'Career', 'Growth', 'Review'] as const
type ViewName = typeof navigation[number]

type AppProps = { onSignOut: () => Promise<void> }

function App({ onSignOut }: AppProps) {
  const [activeView, setActiveView] = useState<ViewName>('Today')
  const today = toLocalDate()
  const tasks = useTasks()
  const goals = useGoals()
  const opportunities = useOpportunities()
  const skills = useSkills()
  const projects = useProjects()
  const evidence = useEvidence()
  const reviews = useWeeklyReviews()
  const habits = useHabits(today)
  const events = useEvents()
  const error = [tasks.error, goals.error, opportunities.error, skills.error, projects.error, evidence.error, reviews.error, habits.error, events.error].find(Boolean) ?? ''

  function renderView() {
    if (activeView === 'Today') return <TodayView addHabit={habits.addHabit} addTask={tasks.addTask} completeHabit={habits.completeHabit} completeTask={tasks.completeTask} deleteTask={tasks.deleteTask} error={error} goals={goals.goals} habitCompletions={habits.habitCompletions} habits={habits.habits} recentHabitCompletionCount={habits.recentHabitCompletionCount} today={today} tasks={tasks.tasks} updateTask={tasks.updateTask} />
    if (activeView === 'Plan') return <PlanView addEvent={events.addEvent} completeTask={tasks.completeTask} deleteTask={tasks.deleteTask} error={error} events={events.events} goals={goals.goals} opportunities={opportunities.opportunities} tasks={tasks.tasks} updateTask={tasks.updateTask} weeklyReviews={reviews.weeklyReviews} />
    if (activeView === 'Goals') return <GoalsView addGoal={goals.addGoal} error={error} goals={goals.goals} tasks={tasks.tasks} />
    if (activeView === 'Career') return <CareerView addOpportunity={opportunities.addOpportunity} error={error} opportunities={opportunities.opportunities} />
    if (activeView === 'Growth') return <GrowthView addEvidence={evidence.addEvidence} addProject={projects.addProject} addSkill={skills.addSkill} error={error} evidence={evidence.evidence} projects={projects.projects} skills={skills.skills} updateProject={projects.updateProject} updateSkill={skills.updateSkill} />
    if (reviews.isLoading) return <section className="empty-state"><strong>Loading your review...</strong></section>
    return <ReviewView error={error} saveWeeklyReview={reviews.saveWeeklyReview} weeklyReviews={reviews.weeklyReviews} />
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark"><span>H</span> Hop</div>
        <p className="brand-tagline">Small actions. Real progress.</p>
        <nav aria-label="Primary navigation">
          {navigation.map((item) => <button className={activeView === item ? 'nav-item active' : 'nav-item'} key={item} onClick={() => setActiveView(item)} type="button"><span className="nav-dot" aria-hidden="true" />{item}</button>)}
        </nav>
        <div className="sidebar-footer"><span className="status-dot" aria-hidden="true" /> Private workspace</div>
      </aside>
      <main className="main-content">
        <header className="topbar"><div><p className="eyebrow">{activeView}</p><h1>{activeView === 'Today' ? 'Make today count.' : activeView === 'Growth' ? 'Make progress visible.' : `${activeView} is coming next.`}</h1></div><div className="topbar-actions"><button className="icon-button" aria-label="Notifications" type="button">○</button><button className="text-button sign-out" onClick={() => void onSignOut()} type="button">Sign out</button></div></header>
        <OfflineBanner />
        {renderView()}
      </main>
    </div>
  )
}

export default App
