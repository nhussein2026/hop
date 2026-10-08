import 'dotenv/config';
import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';

import {
  changePasswordSchema,
  createGoalSchema,
  createHabitSchema,
  habitCompletionRangeSchema,
  loginSchema,
  restoreRequestSchema,
  setupPasswordSchema,
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

import { authService } from './services/auth.service.js';
import { backupService } from './services/backup.service.js';
import { goalService } from './services/goal.service.js';
import { habitService } from './services/habit.service.js';
import { evidenceService } from './services/evidence.service.js';
import { eventService } from './services/event.service.js';
import { opportunityService } from './services/opportunity.service.js';
import { projectService } from './services/project.service.js';
import { restoreService } from './services/restore.service.js';
import { skillService } from './services/skill.service.js';
import { taskService } from './services/task.service.js';
import { weeklyReviewService } from './services/weekly-review.service.js';

import { resolveHost, resolvePort, resolveWebDistDirectory } from './config.js';
import { clearedSessionCookie, isSameOriginRequest, readSessionToken, sessionCookie } from './auth/http.js';
import { createRateLimiter } from './auth/rate-limit.js';
import { ConflictError, InvalidInputError, RequestError } from './errors.js';
import { serveWebApp } from './static.js';

const port = resolvePort();
const host = resolveHost();
const webDistDir = resolveWebDistDirectory();
const maxBodyBytes = 1024 * 1024;
// Backups hold every record, so restore requests may be much larger than ordinary ones.
const maxRestoreBodyBytes = 50 * 1024 * 1024;
const backupCheckIntervalMs = 60 * 60 * 1000;
const passwordAttempts = createRateLimiter({ maxFailures: 5, windowMs: 15 * 60 * 1000 });

function isLoopbackHost(value: string) {
  return value === 'localhost' || value === '::1' || value.startsWith('127.');
}

function runDailyBackup() {
  try {
    const backup = backupService.runDailyBackup();

    if (backup) {
      console.log(`Hop backup created: ${backup.fileName}`);
    }
  } catch (error) {
    console.error('Hop daily backup failed', error);
  }
}

function sendJson(response: import('node:http').ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  response.writeHead(status, {
    ...headers,
    'Content-Type': 'application/json; charset=utf-8',
  });

  response.end(JSON.stringify(body));
}

async function readBody(request: import('node:http').IncomingMessage, maxBytes = maxBodyBytes) {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request as AsyncIterable<Buffer>) {
    size += chunk.length;

    if (size > maxBytes) {
      throw new RequestError(413, 'Request body is too large');
    }

    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new RequestError(400, 'Request body must be valid JSON');
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

  try {
    if (!url.pathname.startsWith('/api/')) {
      if (!serveWebApp(request, response, webDistDir, url.pathname)) {
        sendJson(response, 404, { error: 'Not found' });
      }

      return;
    }

    if (request.method !== 'GET' && !isSameOriginRequest(request)) {
      sendJson(response, 403, { error: 'Cross-site requests are not allowed' });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, { name: 'Hop API', status: 'ok' });
      return;
    }

    const sessionToken = readSessionToken(request);
    const authenticated = sessionToken !== undefined && authService.validateSession(sessionToken);
    const userAgent = request.headers['user-agent'] ?? null;
    const clientKey = request.socket.remoteAddress ?? 'unknown';

    if (request.method === 'GET' && url.pathname === '/api/auth/session') {
      sendJson(response, 200, { setupRequired: authService.isSetupRequired(), authenticated });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/setup') {
      const result = setupPasswordSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      const session = await authService.setup(result.data.password, userAgent);
      sendJson(response, 201, { authenticated: true }, { 'Set-Cookie': sessionCookie(session.token, session.expiresAt) });
      return;
    }

    if (request.method === 'POST' && (url.pathname === '/api/auth/login' || url.pathname === '/api/auth/password')) {
      const retryAfter = passwordAttempts.retryAfterSeconds(clientKey);

      if (retryAfter > 0) {
        sendJson(response, 429, { error: 'Too many attempts. Try again later.' }, { 'Retry-After': String(retryAfter) });
        return;
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/login') {
      const result = loginSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      const session = await authService.login(result.data.password, userAgent);

      if (!session) {
        passwordAttempts.recordFailure(clientKey);
        sendJson(response, 401, { error: 'Incorrect password' });
        return;
      }

      passwordAttempts.reset(clientKey);
      sendJson(response, 200, { authenticated: true }, { 'Set-Cookie': sessionCookie(session.token, session.expiresAt) });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
      if (sessionToken) {
        authService.logout(sessionToken);
      }

      sendJson(response, 200, { authenticated: false }, { 'Set-Cookie': clearedSessionCookie() });
      return;
    }

    if (!authenticated) {
      sendJson(response, 401, { error: 'Sign in to continue' });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/password') {
      const result = changePasswordSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      const session = await authService.changePassword(result.data.currentPassword, result.data.newPassword, userAgent);

      if (!session) {
        passwordAttempts.recordFailure(clientKey);
        sendJson(response, 401, { error: 'Current password is incorrect' });
        return;
      }

      passwordAttempts.reset(clientKey);
      sendJson(response, 200, { authenticated: true }, { 'Set-Cookie': sessionCookie(session.token, session.expiresAt) });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/export') {
      const snapshot = backupService.createSnapshot();
      const fileName = `hop-export-${snapshot.exportedAt.slice(0, 10)}.json`;

      response.writeHead(200, {
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify(snapshot, null, 2));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/backups') {
      sendJson(response, 200, backupService.listBackups().map(({ fileName, date, sizeBytes }) => ({ fileName, date, sizeBytes })));
      return;
    }

    const backupFileName = url.pathname.match(/^\/api\/backups\/([^/]+)$/)?.[1];

    if (request.method === 'GET' && backupFileName) {
      // Only names that appear in the backup directory listing are served, so no path can escape it.
      const backup = backupService.findBackup(decodeURIComponent(backupFileName));

      if (!backup) {
        sendJson(response, 404, { error: 'Backup not found' });
        return;
      }

      response.writeHead(200, {
        'Content-Disposition': `attachment; filename="${backup.fileName}"`,
        'Content-Length': String(backup.sizeBytes),
        'Content-Type': 'application/json; charset=utf-8',
      });
      createReadStream(backup.filePath).pipe(response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/restore/preview') {
      sendJson(response, 200, restoreService.preview(await readBody(request, maxRestoreBodyBytes)));
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/restore') {
      const result = restoreRequestSchema.safeParse(await readBody(request, maxRestoreBodyBytes));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.issues[0]?.message ?? 'Invalid restore request' });
        return;
      }

      sendJson(response, 200, restoreService.restore(result.data.snapshot));
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/backups') {
      const { fileName, date, sizeBytes } = backupService.exportDatabase();
      sendJson(response, 201, { fileName, date, sizeBytes });
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
      const result = habitCompletionRangeSchema.safeParse({
        from: date ?? url.searchParams.get('from'),
        to: date ?? url.searchParams.get('to'),
      });

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      sendJson(response, 200, habitService.getCompletions(result.data.from, result.data.to));
      return;
    }

    const habitId = url.pathname.match(/^\/api\/habits\/([^/]+)\/completions$/)?.[1];

    if (request.method === 'POST' && habitId) {
      const result = habitCompletionSchema.safeParse(await readBody(request));

      if (!result.success) {
        sendJson(response, 400, { error: result.error.flatten() });
        return;
      }

      const completion = habitService.complete(habitId, result.data.date);

      if (!completion) {
        sendJson(response, 404, { error: 'Habit not found' });
        return;
      }

      sendJson(response, 201, completion);
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
    if (error instanceof RequestError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }

    if (error instanceof InvalidInputError) {
      sendJson(response, 400, { error: error.message });
      return;
    }

    if (error instanceof ConflictError) {
      sendJson(response, 409, { error: error.message });
      return;
    }

    console.error(error);
    sendJson(response, 500, { error: 'The server could not complete the request' });
  }
});

if (!isLoopbackHost(host) && authService.isSetupRequired()) {
  console.error(`Refusing to listen on ${host}: set a Hop password first. Start Hop with the default HOST, open it on this machine, and complete setup.`);
  process.exit(1);
}

server.listen(port, host, () => {
  console.log(`Hop API running on http://${host}:${port}`);
  runDailyBackup();
  setInterval(runDailyBackup, backupCheckIntervalMs).unref();
});