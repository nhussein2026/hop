import 'dotenv/config';
import { createServer } from 'node:http';

import {
  createGoalSchema,
  createHabitSchema,
  habitCompletionSchema,
  createEvidenceSchema,
  createEventSchema,
  createOpportunitySchema,
  createProjectSchema,
  createSkillSchema,
  createTaskSchema,
  createWeeklyReviewSchema,
  updateGoalSchema,
  updateEvidenceSchema,
  updateEventSchema,
  updateOpportunitySchema,
  updateProjectSchema,
  updateSkillSchema,
  updateTaskSchema,
  updateWeeklyReviewSchema,
} from '@hop/validation';
import type {
  CreateGoalInput,
  CreateHabitInput,
  CreateEvidenceInput,
  CreateEventInput,
  CreateOpportunityInput,
  CreateProjectInput,
  CreateSkillInput,
  CreateTaskInput,
  CreateWeeklyReviewInput,
  UpdateGoalInput,
  UpdateEvidenceInput,
  UpdateEventInput,
  UpdateOpportunityInput,
  UpdateProjectInput,
  UpdateSkillInput,
  UpdateTaskInput,
  UpdateWeeklyReviewInput,
} from '@hop/domain';

import { goalService } from './services/goal.service.js';
import { habitService } from './services/habit.service.js';
import { evidenceService } from './services/evidence.service.js';
import { eventService } from './services/event.service.js';
import { opportunityService } from './services/opportunity.service.js';
import { projectService } from './services/project.service.js';
import { skillService } from './services/skill.service.js';
import { taskService } from './services/task.service.js';
import { weeklyReviewService } from './services/weekly-review.service.js';

import { resolvePort } from './config.js';

const port = resolvePort();

function sendJson(response: import('node:http').ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  });

  response.end(JSON.stringify(body));
}

async function readBody(request: import('node:http').IncomingMessage) {
  let body = '';

  for await (const chunk of request) {
    body += chunk;
  }

  return JSON.parse(body) as unknown;
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, null);
    return;
  }

  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

  try {
    if (request.method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, { name: 'Hop API', status: 'ok' });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/goals') {
      sendJson(response, 200, goalService.getAll());
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/evidence') {
      sendJson(response, 200, evidenceService.getAll());
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/events') {
      sendJson(response, 200, eventService.getAll());
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/events') {
      const result = createEventSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      sendJson(response, 201, eventService.create(result.data as CreateEventInput));
      return;
    }

    const eventId = url.pathname.match(/^\/api\/events\/([^/]+)$/)?.[1];

    if (request.method === 'PATCH' && eventId) {
      const result = updateEventSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      const event = eventService.update(eventId, result.data as UpdateEventInput);

      if (!event) {
        sendJson(response, 404, { error: 'Event not found' });
        return;
      }

      sendJson(response, 200, event);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/evidence') {
      const result = createEvidenceSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      sendJson(response, 201, evidenceService.create(result.data as CreateEvidenceInput));
      return;
    }

    const evidenceId = url.pathname.match(/^\/api\/evidence\/([^/]+)$/)?.[1];

    if (request.method === 'PATCH' && evidenceId) {
      const result = updateEvidenceSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      const item = evidenceService.update(evidenceId, result.data as UpdateEvidenceInput);

      if (!item) {
        sendJson(response, 404, { error: 'Evidence not found' });
        return;
      }

      sendJson(response, 200, item);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/habits') {
      sendJson(response, 200, habitService.getAll());
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/habits') {
      const result = createHabitSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      sendJson(response, 201, habitService.create(result.data as CreateHabitInput));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/habits/completions') {
      const date = url.searchParams.get('date');
      const result = habitCompletionSchema.safeParse({ date });

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      sendJson(response, 200, habitService.getCompletions(result.data.date));
      return;
    }

    const habitId = url.pathname.match(/^\/api\/habits\/([^/]+)\/completions$/)?.[1];

    if (request.method === 'POST' && habitId) {
      const result = habitCompletionSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      sendJson(response, 201, habitService.complete(habitId, result.data.date));
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/goals') {
      const result = createGoalSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      sendJson(response, 201, goalService.create(result.data as CreateGoalInput));
      return;
    }

    const goalId = url.pathname.match(/^\/api\/goals\/([^/]+)$/)?.[1];

    if (request.method === 'PATCH' && goalId) {
      const result = updateGoalSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      const goal = goalService.update(goalId, result.data as UpdateGoalInput);

      if (!goal) {
        sendJson(response, 404, { error: 'Goal not found' });
        return;
      }

      sendJson(response, 200, goal);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/opportunities') {
      sendJson(response, 200, opportunityService.getAll());
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/opportunities') {
      const result = createOpportunitySchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      sendJson(response, 201, opportunityService.create(result.data as CreateOpportunityInput));
      return;
    }

    const opportunityId = url.pathname.match(/^\/api\/opportunities\/([^/]+)$/)?.[1];

    if (request.method === 'PATCH' && opportunityId) {
      const result = updateOpportunitySchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      const opportunity = opportunityService.update(opportunityId, result.data as UpdateOpportunityInput);

      if (!opportunity) {
        sendJson(response, 404, { error: 'Opportunity not found' });
        return;
      }

      sendJson(response, 200, opportunity);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/projects') {
      sendJson(response, 200, projectService.getAll());
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/projects') {
      const result = createProjectSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      sendJson(response, 201, projectService.create(result.data as CreateProjectInput));
      return;
    }

    const projectId = url.pathname.match(/^\/api\/projects\/([^/]+)$/)?.[1];

    if (request.method === 'PATCH' && projectId) {
      const result = updateProjectSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      const project = projectService.update(projectId, result.data as UpdateProjectInput);

      if (!project) {
        sendJson(response, 404, { error: 'Project not found' });
        return;
      }

      sendJson(response, 200, project);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/skills') {
      sendJson(response, 200, skillService.getAll());
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/skills') {
      const result = createSkillSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      sendJson(response, 201, skillService.create(result.data as CreateSkillInput));
      return;
    }

    const skillId = url.pathname.match(/^\/api\/skills\/([^/]+)$/)?.[1];

    if (request.method === 'PATCH' && skillId) {
      const result = updateSkillSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      const skill = skillService.update(skillId, result.data as UpdateSkillInput);

      if (!skill) {
        sendJson(response, 404, { error: 'Skill not found' });
        return;
      }

      sendJson(response, 200, skill);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/tasks') {
      sendJson(response, 200, taskService.getAll());
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/reviews/weekly') {
      sendJson(response, 200, weeklyReviewService.getAll());
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/reviews/weekly') {
      const result = createWeeklyReviewSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      sendJson(response, 201, weeklyReviewService.create(result.data as CreateWeeklyReviewInput));
      return;
    }

    const weeklyReviewId = url.pathname.match(/^\/api\/reviews\/weekly\/([^/]+)$/)?.[1];

    if (request.method === 'PATCH' && weeklyReviewId) {
      const result = updateWeeklyReviewSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      const review = weeklyReviewService.update(weeklyReviewId, result.data as UpdateWeeklyReviewInput);

      if (!review) {
        sendJson(response, 404, { error: 'Weekly review not found' });
        return;
      }

      sendJson(response, 200, review);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/tasks') {
      const result = createTaskSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      sendJson(response, 201, taskService.create(result.data as CreateTaskInput));
      return;
    }

    const taskId = url.pathname.match(/^\/api\/tasks\/([^/]+)$/)?.[1];

    if (request.method === 'PATCH' && taskId) {
      const result = updateTaskSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      const task = taskService.update(taskId, result.data as UpdateTaskInput);

      if (!task) {
        sendJson(response, 404, { error: 'Task not found' });
        return;
      }

      sendJson(response, 200, task);
      return;
    }

    if (request.method === 'DELETE' && taskId) {
      const deleted = taskService.delete(taskId);

      if (!deleted) {
        sendJson(response, 404, { error: 'Task not found' });
        return;
      }

      sendJson(response, 200, { ok: true });
      return;
    }

    sendJson(response, 404, { error: 'Route not found' });
  } catch (error) {
    console.error(error);
    sendJson(response, 400, { error: 'Request could not be processed' });
  }
});

server.listen(port, () => {
  console.log(`Hop API running on http://localhost:${port}`);
});