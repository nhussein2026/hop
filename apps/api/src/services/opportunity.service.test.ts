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
