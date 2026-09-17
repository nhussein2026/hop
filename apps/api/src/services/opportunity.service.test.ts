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
