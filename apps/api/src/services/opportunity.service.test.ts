import test from 'node:test';
import assert from 'node:assert/strict';

import { opportunityService } from './opportunity.service.js';

test('opportunityService.create assigns defaults and timestamps', () => {
  const opportunity = opportunityService.create({
    title: 'Senior Frontend Engineer',
    organization: 'Northstar Labs',
    type: 'job',
    source: 'linkedin',
  });

  assert.equal(opportunity.title, 'Senior Frontend Engineer');
  assert.equal(opportunity.stage, 'saved');
  assert.equal(opportunity.priority, 'medium');
  assert.equal(opportunity.type, 'job');
  assert.ok(opportunity.id.length > 0);
  assert.ok(opportunity.createdAt.length > 0);
  assert.ok(opportunity.updatedAt.length > 0);
});

test('opportunityService.update records closedAt when the opportunity is accepted', () => {
  const opportunity = opportunityService.create({
    title: 'AI Product Engineer',
    organization: 'Signal Foundry',
    type: 'job',
  });

  const updated = opportunityService.update(opportunity.id, {
    stage: 'accepted',
  });

  assert.ok(updated);
  assert.equal(updated?.stage, 'accepted');
  assert.ok(updated?.closedAt);
});

test('opportunityService records closedAt for every terminal stage and clears it when reopened', () => {
  const opportunity = opportunityService.create({ title: 'Platform engineer', stage: 'applied' });
  const rejected = opportunityService.update(opportunity.id, { stage: 'rejected' });

  assert.ok(rejected?.closedAt);

  const reopened = opportunityService.update(opportunity.id, { stage: 'interview' });
  assert.equal(reopened?.closedAt, null);

  const createdClosed = opportunityService.create({ title: 'Expired fellowship', stage: 'expired' });
  assert.ok(createdClosed.closedAt);
});

test('stage changes are logged and the furthest stage survives closing', () => {
  const opportunity = opportunityService.create({ title: 'Backend Engineer', organization: 'Insider' });
  opportunityService.update(opportunity.id, { stage: 'applied' });
  opportunityService.update(opportunity.id, { stage: 'interview' });
  const closed = opportunityService.close(opportunity.id, 'rejected', 'Wanted more Go experience');

  assert.equal(closed?.reachedStage, 'interview');
  assert.ok(closed?.appliedDate);
  assert.deepEqual(closed?.activities.map((activity) => activity.type), ['created', 'application_submitted', 'stage_changed', 'rejection_received']);
  assert.equal(closed?.activities.at(-1)?.text, 'Closed: Rejected. Wanted more Go experience');

  const reopened = opportunityService.reopen(opportunity.id);
  assert.equal(reopened?.stage, 'interview');
  assert.equal(reopened?.closedAt, null);
});

test('preparation items and logged activity are returned with the opportunity', () => {
  const opportunity = opportunityService.create({ title: 'ML Engineer', stage: 'interview' });
  const withPrep = opportunityService.addPrepItem(opportunity.id, 'Review the system design notes');
  const item = withPrep?.prep[0];

  assert.equal(item?.done, false);
  assert.equal(opportunityService.updatePrepItem(opportunity.id, item!.id, { done: true })?.prep[0]?.done, true);

  const logged = opportunityService.logActivity(opportunity.id, { type: 'email_received', text: 'Recruiter replied', date: '2026-09-01' });
  assert.equal(logged?.activities.find((activity) => activity.type === 'email_received')?.at, '2026-09-01T12:00:00.000Z');
});
