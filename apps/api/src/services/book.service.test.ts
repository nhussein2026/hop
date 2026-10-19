import test from 'node:test';
import assert from 'node:assert/strict';

import { ConflictError, InvalidInputError } from '../errors.js';
import { bookService } from './book.service.js';
import { habitService } from './habit.service.js';
import { findService } from './research.service.js';

test('a new book waits on the wish list with sensible defaults', () => {
  const book = bookService.create({ title: 'Kod', author: 'Charles Petzold', language: 'tr', suggestedBy: 'A senior at İTÜ' });

  assert.equal(book.status, 'want');
  assert.equal(book.format, 'paper');
  assert.equal(book.why, '');
  assert.deepEqual([book.loans, book.log, book.takeaways], [[], [], []]);
});

test('a book cannot be finished before it was started', () => {
  assert.throws(() => bookService.create({ title: 'Backwards', startedOn: '2026-10-10', finishedOn: '2026-10-01' }), InvalidInputError);
  const book = bookService.create({ title: 'Forwards', startedOn: '2026-10-10' });
  assert.throws(() => bookService.update(book.id, { finishedOn: '2026-10-09' }), InvalidInputError);
});

test('logging pages starts the book and keeps one entry per day', () => {
  const book = bookService.create({ title: 'Clean Code', pages: 400 });

  const first = bookService.log(book.id, { date: '2026-10-18', page: 20 })!;
  assert.equal(first.book.status, 'reading');
  assert.equal(first.book.startedOn, '2026-10-18');

  const again = bookService.log(book.id, { date: '2026-10-18', page: 35 })!;
  assert.deepEqual(again.book.log.map((entry) => [entry.date, entry.page]), [['2026-10-18', 35]]);

  // Backfilling an earlier day moves the start back.
  const earlier = bookService.log(book.id, { date: '2026-10-16', page: 8 })!;
  assert.equal(earlier.book.startedOn, '2026-10-16');
  assert.deepEqual(earlier.book.log.map((entry) => entry.date), ['2026-10-16', '2026-10-18']);

  assert.throws(() => bookService.log(book.id, { date: '2026-10-19', page: 401 }), InvalidInputError);
  assert.deepEqual(bookService.unlog(book.id, '2026-10-16')?.log.map((entry) => entry.page), [35]);
  assert.equal(bookService.unlog(book.id, '2026-10-16'), undefined);
});

test('logging progress ticks the linked habit once, and says when it did', () => {
  const habit = habitService.create({ name: 'Read 20 pages' });
  const book = bookService.create({ title: 'Designing Data-Intensive Applications', habitId: habit.id });

  const first = bookService.log(book.id, { date: '2026-10-17', page: 30 })!;
  assert.equal(first.completion?.habitId, habit.id);

  // Already done that day: nothing new to undo.
  assert.equal(bookService.log(book.id, { date: '2026-10-17', page: 40 })!.completion, null);

  // No pages read since the day before: the habit is not done.
  assert.equal(bookService.log(book.id, { date: '2026-10-18', page: 40 })!.completion, null);
  assert.deepEqual(habitService.getCompletions('2026-10-17', '2026-10-18').filter((c) => c.habitId === habit.id).map((c) => c.date), ['2026-10-17']);
});

test('a book is borrowed once at a time, and the next loan remembers the library', () => {
  const book = bookService.create({ title: 'Algoritmalara Giriş' });
  const borrowed = bookService.addLoan(book.id, { library: 'İTÜ Mustafa İnan Library', borrowedOn: '2026-10-01', dueOn: '2026-10-15', maxRenewals: 3 })!;
  const loan = borrowed.loans[0]!;

  assert.throws(() => bookService.addLoan(book.id, { borrowedOn: '2026-10-02', dueOn: '2026-10-16' }), ConflictError);
  bookService.updateLoan(book.id, loan.id, { returnedOn: '2026-10-12' });

  const again = bookService.addLoan(book.id, { borrowedOn: '2026-11-01', dueOn: '2026-11-15' })!;
  assert.deepEqual(again.loans.map((l) => [l.library, l.maxRenewals, l.returnedOn]), [['İTÜ Mustafa İnan Library', 3, '2026-10-12'], ['İTÜ Mustafa İnan Library', 3, null]]);
});

test('loan dates must make sense', () => {
  const book = bookService.create({ title: 'Dates' });
  assert.throws(() => bookService.addLoan(book.id, { borrowedOn: '2026-10-10', dueOn: '2026-10-01' }), InvalidInputError);
  const loan = bookService.addLoan(book.id, { borrowedOn: '2026-10-10', dueOn: '2026-10-24' })!.loans[0]!;
  assert.equal(loan.library, 'İTÜ Library');
  assert.throws(() => bookService.updateLoan(book.id, loan.id, { returnedOn: '2026-10-09' }), InvalidInputError);
  assert.equal(bookService.updateLoan('missing', loan.id, { returnedOn: '2026-10-11' }), undefined);
});

test('renewals move the due date later, up to the library limit', () => {
  const book = bookService.create({ title: 'Renewed' });
  const loan = bookService.addLoan(book.id, { borrowedOn: '2026-10-01', dueOn: '2026-10-15', maxRenewals: 1 })!.loans[0]!;

  assert.throws(() => bookService.renewLoan(book.id, loan.id, { date: '2026-10-14', dueOn: '2026-10-15' }), InvalidInputError);
  const renewed = bookService.renewLoan(book.id, loan.id, { date: '2026-10-14', dueOn: '2026-10-28' })!.loans[0]!;
  assert.deepEqual([renewed.dueOn, renewed.renewedOn], ['2026-10-28', ['2026-10-14']]);

  assert.throws(() => bookService.renewLoan(book.id, loan.id, { date: '2026-10-27', dueOn: '2026-11-10' }), ConflictError);

  // Undo puts the renewal back.
  const undone = bookService.updateLoan(book.id, loan.id, { dueOn: '2026-10-15', renewedOn: [] })!.loans[0]!;
  assert.deepEqual([undone.dueOn, undone.renewedOn], ['2026-10-15', []]);
});

test('deleting a book removes its loans and log and unlinks the find it came from', () => {
  const book = bookService.create({ title: 'Gone' });
  bookService.addLoan(book.id, { borrowedOn: '2026-10-01', dueOn: '2026-10-15' });
  bookService.log(book.id, { date: '2026-10-02', page: 10 });
  const find = findService.create({ kind: 'book', title: 'Gone', why: 'Heard about it', language: 'en' });
  findService.update(find.id, { status: 'converted', bookId: book.id });

  assert.equal(bookService.delete(book.id), true);
  assert.equal(bookService.getAll().some((b) => b.id === book.id), false);
  assert.equal(findService.getAll().find((f) => f.id === find.id)?.bookId, null);
  assert.equal(findService.getAll().find((f) => f.id === find.id)?.language, 'en');
});
