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

test('a repeating event has its times per weekday, can skip one date, and goes away whole', () => {
  const kaleem = eventService.create({
    title: 'Kaleem meeting',
    date: '2026-10-28',
    repeat: [{ day: 3, start: '19:30', end: '20:30' }, { day: 0, start: '21:15', end: '22:15' }],
  });
  assert.equal(kaleem.repeat?.length, 2);
  assert.deepEqual(kaleem.skips, []);
  assert.equal(eventService.create({ title: 'Call', date: '2026-10-28' }).repeat, null);

  assert.deepEqual(eventService.update(kaleem.id, { skips: ['2026-11-04'] })?.skips, ['2026-11-04']);
  assert.equal(eventService.update(kaleem.id, { repeat: null })?.repeat, null);

  assert.equal(eventService.delete(kaleem.id), true);
  assert.equal(eventService.getAll().some((e) => e.id === kaleem.id), false);
});
