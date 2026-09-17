import test from 'node:test';
import assert from 'node:assert/strict';

import { eventService } from './event.service.js';

test('eventService.create assigns an event type and preserves date-only values', () => {
  const event = eventService.create({
    title: 'Technical interview',
    date: '2026-09-22',
    startTime: '14:00',
    type: 'interview',
  });

  assert.equal(event.type, 'interview');
  assert.equal(event.date, '2026-09-22');
  assert.equal(event.startTime, '14:00');
});

test('eventService.update changes an agenda event', () => {
  const event = eventService.create({ title: 'Weekly review', date: '2026-09-20' });
  const updated = eventService.update(event.id, { type: 'review', startTime: '09:00' });

  assert.ok(updated);
  assert.equal(updated?.type, 'review');
  assert.equal(updated?.startTime, '09:00');
});
