-- Schema created by the hand-written bootstrap in db/client.ts before Hop used migrations.
-- Used to test that existing databases are baselined instead of migrated from scratch.
  CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  why TEXT,
  area_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT NOT NULL DEFAULT 'medium',
  start_date TEXT,
  target_date TEXT,
  success_criteria TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);
  CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  area_id TEXT,
  goal_id TEXT,
  project_id TEXT,
  opportunity_id TEXT,
  scheduled_date TEXT,
  due_date TEXT,
  estimated_minutes INTEGER,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
  CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  organization TEXT,
  url TEXT,
  type TEXT NOT NULL DEFAULT 'other',
  stage TEXT NOT NULL DEFAULT 'saved',
  priority TEXT NOT NULL DEFAULT 'medium',
  location TEXT,
  remote INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  open_date TEXT,
  deadline TEXT,
  applied_date TEXT,
  decision_date TEXT,
  next_event_date TEXT,
  next_event_label TEXT,
  compensation TEXT,
  technology_tags TEXT,
  resume_id TEXT,
  cover_letter_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT
);
  CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  level TEXT NOT NULL DEFAULT 'learning',
  confidence INTEGER,
  last_practiced_at TEXT,
  years_experience REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
  CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  problem TEXT,
  blurb TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  start_date TEXT,
  end_date TEXT,
  stack TEXT NOT NULL DEFAULT '[]',
  repository_url TEXT,
  demo_url TEXT,
  learned TEXT,
  challenges TEXT,
  architecture_notes TEXT,
  goal_ids TEXT NOT NULL DEFAULT '[]',
  skill_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
  CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  skill_id TEXT,
  project_id TEXT,
  opportunity_id TEXT,
  goal_id TEXT,
  url TEXT,
  date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
  CREATE TABLE IF NOT EXISTS weekly_reviews (
  id TEXT PRIMARY KEY NOT NULL,
  week_start TEXT NOT NULL,
  wins TEXT NOT NULL DEFAULT '',
  progress TEXT NOT NULL DEFAULT '',
  career TEXT NOT NULL DEFAULT '',
  learning TEXT NOT NULL DEFAULT '',
  projects TEXT NOT NULL DEFAULT '',
  problems TEXT NOT NULL DEFAULT '',
  next_week TEXT NOT NULL DEFAULT '',
  energy INTEGER,
  focus INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
  CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily',
  target_per_week INTEGER NOT NULL DEFAULT 7,
  goal_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_completions (
  id TEXT PRIMARY KEY NOT NULL,
  habit_id TEXT NOT NULL,
  date TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  UNIQUE (habit_id, date)
);
  CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'other',
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  goal_id TEXT,
  project_id TEXT,
  opportunity_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
