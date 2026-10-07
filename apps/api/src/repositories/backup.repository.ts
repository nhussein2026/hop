import { db } from '../db/client.js';
import {
  events,
  evidence,
  goals,
  habitCompletions,
  habits,
  opportunities,
  projects,
  skills,
  tasks,
  weeklyReviews,
} from '../db/schema/index.js';

export const backupRepository = {
  readAllTables() {
    return {
      goals: db.select().from(goals).all(),
      tasks: db.select().from(tasks).all(),
      habits: db.select().from(habits).all(),
      habitCompletions: db.select().from(habitCompletions).all(),
      events: db.select().from(events).all(),
      opportunities: db.select().from(opportunities).all(),
      projects: db.select().from(projects).all(),
      skills: db.select().from(skills).all(),
      evidence: db.select().from(evidence).all(),
      weeklyReviews: db.select().from(weeklyReviews).all(),
    };
  },
};
