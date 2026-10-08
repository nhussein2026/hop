import 'dotenv/config';
import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  changePasswordSchema,
  closeOpportunitySchema,
  createContactSchema,
  createGoalCriterionSchema,
  createInteractionSchema,
  createMilestoneSchema,
  createMonthlyReviewSchema,
  createOpportunityActivitySchema,
  createOpportunityPrepSchema,
  createResumeSchema,
  saveReflectionSchema,
  updateContactSchema,
  updateGoalCriterionSchema,
  updateHabitSchema,
  updateMilestoneSchema,
  updateMonthlyReviewSchema,
  updateOpportunityPrepSchema,
  updateResumeSchema,
  updateSettingsSchema,
  dateSchema,
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
import type { ZodType } from 'zod';
import type {
  CreateContactInput,
  CreateInteractionInput,
  CreateMilestoneInput,
  CreateMonthlyReviewInput,
  CreateOpportunityActivityInput,
  CreateResumeInput,
  SaveReflectionInput,
  UpdateContactInput,
  UpdateHabitInput,
  UpdateMilestoneInput,
  UpdateMonthlyReviewInput,
  UpdateResumeInput,
  UpdateSettingsInput,
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
import { RESUME_FILE_MAX_BYTES } from '@hop/domain';

import { authService } from './services/auth.service.js';
import { backupService } from './services/backup.service.js';
import { contactService } from './services/contact.service.js';
import { milestoneService } from './services/milestone.service.js';
import { monthlyReviewService } from './services/monthly-review.service.js';
import { reflectionService } from './services/reflection.service.js';
import { resumeService } from './services/resume.service.js';
import { settingsService } from './services/settings.service.js';
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

import { resolveBackupDirectory, resolveDatabasePath, resolveHost, resolvePort, resolveWebDistDirectory } from './config.js';
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

async function readRawBody(request: IncomingMessage, maxBytes = maxBodyBytes) {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request as AsyncIterable<Buffer>) {
    size += chunk.length;

    if (size > maxBytes) {
      throw new RequestError(413, 'Request body is too large');
    }

    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function readBody(request: IncomingMessage, maxBytes = maxBodyBytes) {
  const body = await readRawBody(request, maxBytes);

  try {
    return JSON.parse(body.toString('utf8')) as unknown;
  } catch {
    throw new RequestError(400, 'Request body must be valid JSON');
  }
}

/** Validate a JSON body. Sends a 400 with the validation errors and returns undefined when it is invalid. */
async function readValid<T>(request: IncomingMessage, response: ServerResponse, schema: ZodType): Promise<T | undefined> {
  const result = schema.safeParse(await readBody(request));

  if (!result.success) {
    sendJson(response, 400, { error: result.error.flatten() });
    return undefined;
  }

  return result.data as T;
}

/** Send the updated record, or a 404 when the service found nothing to update. */
function sendFound(response: ServerResponse, value: unknown, notFound: string, status = 200) {
  if (value === undefined) {
    sendJson(response, 404, { error: notFound });
    return;
  }

  sendJson(response, status, value);
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
      sendJson(response, 200, { authenticated: true }, { 'Set-Cookie': sessionCookie(session.token, session.expiresAt, result.data.remember ?? true) });
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

    if (request.method === 'GET' && url.pathname === '/api/auth/sessions') {
      sendJson(response, 200, authService.listSessions(sessionToken));
      return;
    }

    const deviceSessionId = url.pathname.match(/^\/api\/auth\/sessions\/([^/]+)$/)?.[1];

    if (request.method === 'DELETE' && deviceSessionId) {
      sendFound(response, authService.revokeSession(deviceSessionId) ? { ok: true } : undefined, 'Session not found');
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/settings') {
      sendJson(response, 200, settingsService.get());
      return;
    }

    if (request.method === 'PATCH' && url.pathname === '/api/settings') {
      const input = await readValid<UpdateSettingsInput>(request, response, updateSettingsSchema);
      if (input) sendJson(response, 200, settingsService.update(input));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/system') {
      sendJson(response, 200, { databasePath: resolveDatabasePath(), backupDirectory: resolveBackupDirectory() });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/backups/test') {
      sendJson(response, 200, restoreService.testLatestBackup());
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/milestones') {
      sendJson(response, 200, milestoneService.getAll());
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/milestones') {
      const input = await readValid<CreateMilestoneInput>(request, response, createMilestoneSchema);
      if (input) sendJson(response, 201, milestoneService.create(input));
      return;
    }

    const milestoneId = url.pathname.match(/^\/api\/milestones\/([^/]+)$/)?.[1];

    if (request.method === 'PATCH' && milestoneId) {
      const input = await readValid<UpdateMilestoneInput>(request, response, updateMilestoneSchema);
      if (input) sendFound(response, milestoneService.update(milestoneId, input), 'Milestone not found');
      return;
    }

    if (request.method === 'DELETE' && milestoneId) {
      sendFound(response, milestoneService.delete(milestoneId) ? { ok: true } : undefined, 'Milestone not found');
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/contacts') {
      sendJson(response, 200, contactService.getAll());
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/contacts') {
      const input = await readValid<CreateContactInput>(request, response, createContactSchema);
      if (input) sendJson(response, 201, contactService.create(input));
      return;
    }

    const contactId = url.pathname.match(/^\/api\/contacts\/([^/]+)$/)?.[1];

    if (request.method === 'PATCH' && contactId) {
      const input = await readValid<UpdateContactInput>(request, response, updateContactSchema);
      if (input) sendFound(response, contactService.update(contactId, input), 'Person not found');
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/interactions') {
      sendJson(response, 200, contactService.getInteractions());
      return;
    }

    const interactionContactId = url.pathname.match(/^\/api\/contacts\/([^/]+)\/interactions$/)?.[1];

    if (request.method === 'POST' && interactionContactId) {
      const input = await readValid<CreateInteractionInput>(request, response, createInteractionSchema);
      if (input) sendFound(response, contactService.logInteraction(interactionContactId, input), 'Person not found', 201);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/resumes') {
      sendJson(response, 200, resumeService.getAll());
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/resumes') {
      const input = await readValid<CreateResumeInput>(request, response, createResumeSchema);
      if (input) sendJson(response, 201, resumeService.create(input));
      return;
    }

    const resumeId = url.pathname.match(/^\/api\/resumes\/([^/]+)$/)?.[1];

    if (request.method === 'PATCH' && resumeId) {
      const input = await readValid<UpdateResumeInput>(request, response, updateResumeSchema);
      if (input) sendFound(response, resumeService.update(resumeId, input), 'Resume not found');
      return;
    }

    const resumeFileId = url.pathname.match(/^\/api\/resumes\/([^/]+)\/file$/)?.[1];

    // The document is sent as the raw request body, with its name in X-File-Name (URI-encoded).
    if (request.method === 'PUT' && resumeFileId) {
      const data = await readRawBody(request, RESUME_FILE_MAX_BYTES);
      let fileName = 'resume';

      try {
        fileName = decodeURIComponent(String(request.headers['x-file-name'] ?? 'resume'));
      } catch {
        // Keep the fallback name; the type check below still applies.
      }

      sendFound(response, resumeService.attachFile(resumeFileId, fileName, data), 'Resume not found');
      return;
    }

    if (request.method === 'DELETE' && resumeFileId) {
      sendFound(response, resumeService.removeFile(resumeFileId), 'Resume not found');
      return;
    }

    if (request.method === 'GET' && resumeFileId) {
      const file = resumeService.getFile(resumeFileId);

      if (!file) {
        sendJson(response, 404, { error: 'This version has no file' });
        return;
      }

      // PDFs open in the browser unless a download is asked for; Word files always download.
      const inline = file.type === 'application/pdf' && url.searchParams.get('download') !== '1';
      response.writeHead(200, {
        'Content-Type': file.type,
        'Content-Length': String(file.size),
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        'Content-Security-Policy': 'sandbox',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      });
      response.end(file.data);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/reflections') {
      sendJson(response, 200, reflectionService.getAll());
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/reflections') {
      const input = await readValid<SaveReflectionInput>(request, response, saveReflectionSchema);
      if (input) sendJson(response, 200, reflectionService.save(input));
      return;
    }

    const criteriaGoalId = url.pathname.match(/^\/api\/goals\/([^/]+)\/criteria$/)?.[1];

    if (request.method === 'POST' && criteriaGoalId) {
      const input = await readValid<{ text: string; note?: string }>(request, response, createGoalCriterionSchema);
      if (input) sendFound(response, goalService.addCriterion(criteriaGoalId, input), 'Goal not found', 201);
      return;
    }

    const criterionPath = url.pathname.match(/^\/api\/goals\/([^/]+)\/criteria\/([^/]+)$/);

    if (request.method === 'PATCH' && criterionPath) {
      const input = await readValid<{ text?: string; note?: string | null; done?: boolean }>(request, response, updateGoalCriterionSchema);
      if (input) sendFound(response, goalService.updateCriterion(criterionPath[1]!, criterionPath[2]!, input), 'Criterion not found');
      return;
    }

    const opportunityAction = url.pathname.match(/^\/api\/opportunities\/([^/]+)\/(close|reopen|prep|activities)$/);

    if (request.method === 'POST' && opportunityAction) {
      const [, id, action] = opportunityAction as unknown as [string, string, string];

      if (action === 'close') {
        const input = await readValid<{ outcome: (typeof closeOpportunitySchema)['_output']['outcome']; note?: string }>(request, response, closeOpportunitySchema);
        if (input) sendFound(response, opportunityService.close(id, input.outcome, input.note), 'Opportunity not found');
      } else if (action === 'reopen') {
        sendFound(response, opportunityService.reopen(id), 'Opportunity not found');
      } else if (action === 'prep') {
        const input = await readValid<{ text: string }>(request, response, createOpportunityPrepSchema);
        if (input) sendFound(response, opportunityService.addPrepItem(id, input.text), 'Opportunity not found', 201);
      } else {
        const input = await readValid<CreateOpportunityActivityInput>(request, response, createOpportunityActivitySchema);
        if (input) sendFound(response, opportunityService.logActivity(id, input), 'Opportunity not found', 201);
      }

      return;
    }

    const activityPath = url.pathname.match(/^\/api\/opportunities\/([^/]+)\/activities\/([^/]+)$/);

    if (request.method === 'DELETE' && activityPath) {
      sendFound(response, opportunityService.deleteActivity(activityPath[1]!, activityPath[2]!), 'Activity not found');
      return;
    }

    const prepPath = url.pathname.match(/^\/api\/opportunities\/([^/]+)\/prep\/([^/]+)$/);

    if (request.method === 'PATCH' && prepPath) {
      const input = await readValid<{ text?: string; done?: boolean }>(request, response, updateOpportunityPrepSchema);
      if (input) sendFound(response, opportunityService.updatePrepItem(prepPath[1]!, prepPath[2]!, input), 'Preparation item not found');
      return;
    }

    const habitPath = url.pathname.match(/^\/api\/habits\/([^/]+)$/)?.[1];

    if (request.method === 'PATCH' && habitPath && habitPath !== 'completions') {
      const input = await readValid<UpdateHabitInput>(request, response, updateHabitSchema);
      if (input) sendFound(response, habitService.update(habitPath, input), 'Habit not found');
      return;
    }

    const completionPath = url.pathname.match(/^\/api\/habits\/([^/]+)\/completions\/([^/]+)$/);

    if (request.method === 'DELETE' && completionPath) {
      const date = dateSchema.safeParse(completionPath[2]);

      if (!date.success) {
        sendJson(response, 400, { error: 'Date must use YYYY-MM-DD format' });
        return;
      }

      sendFound(response, habitService.uncomplete(completionPath[1]!, date.data) ? { ok: true } : undefined, 'Completion not found');
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

    if (request.method === 'GET' && url.pathname === '/api/reviews/monthly') {
      sendJson(response, 200, monthlyReviewService.getAll());
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/reviews/monthly') {
      const input = await readValid<CreateMonthlyReviewInput>(request, response, createMonthlyReviewSchema);
      if (input) sendJson(response, 201, monthlyReviewService.create(input));
      return;
    }

    const monthlyReviewId = url.pathname.match(/^\/api\/reviews\/monthly\/([^/]+)$/)?.[1];

    if (request.method === 'PATCH' && monthlyReviewId) {
      const input = await readValid<UpdateMonthlyReviewInput>(request, response, updateMonthlyReviewSchema);
      if (input) sendFound(response, monthlyReviewService.update(monthlyReviewId, input), 'Monthly review not found');
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