import { randomUUID } from 'node:crypto';

import { DEFAULT_LIBRARY } from '@hop/domain';
import type { Book, BookLoan, BookWithDetails, CreateBookInput, CreateLoanInput, HabitCompletion, LogReadingInput, RenewLoanInput, UpdateBookInput, UpdateLoanInput } from '@hop/domain';

import { db } from '../db/client.js';
import { ConflictError, InvalidInputError } from '../errors.js';
import { bookRepository } from '../repositories/book.repository.js';
import { habitRepository } from '../repositories/habit.repository.js';

function checkDates(startedOn: string | null, finishedOn: string | null) {
  if (startedOn && finishedOn && finishedOn < startedOn) {
    throw new InvalidInputError('A book cannot be finished before it was started');
  }
}

function checkLoanDates(loan: Pick<BookLoan, 'borrowedOn' | 'dueOn' | 'returnedOn'>) {
  if (loan.dueOn < loan.borrowedOn) {
    throw new InvalidInputError('The due date cannot be before the day it was borrowed');
  }

  if (loan.returnedOn && loan.returnedOn < loan.borrowedOn) {
    throw new InvalidInputError('A book cannot be returned before it was borrowed');
  }
}

/** The loan if it belongs to the book. */
function loanOf(book: BookWithDetails, loanId: string): BookLoan | undefined {
  return book.loans.find((loan) => loan.id === loanId);
}

export const bookService = {
  getAll(): BookWithDetails[] {
    return bookRepository.findAll();
  },

  create(input: CreateBookInput): BookWithDetails {
    const now = new Date().toISOString();
    const book = {
      id: randomUUID(),
      title: input.title,
      author: input.author ?? null,
      pages: input.pages ?? null,
      language: input.language ?? null,
      format: input.format ?? 'paper',
      status: input.status ?? 'want',
      why: input.why ?? '',
      suggestedById: input.suggestedById ?? null,
      suggestedBy: input.suggestedBy ?? null,
      topics: input.topics ?? [],
      skillIds: input.skillIds ?? [],
      goalId: input.goalId ?? null,
      habitId: input.habitId ?? null,
      startedOn: input.startedOn ?? null,
      finishedOn: input.finishedOn ?? null,
      rating: input.rating ?? null,
      takeaways: input.takeaways ?? [],
      createdAt: now,
      updatedAt: now,
    };

    checkDates(book.startedOn, book.finishedOn);
    return bookRepository.create(book);
  },

  update(id: string, input: UpdateBookInput): BookWithDetails | undefined {
    const existing = bookRepository.findById(id);

    if (!existing) {
      return undefined;
    }

    checkDates(input.startedOn !== undefined ? input.startedOn : existing.startedOn, input.finishedOn !== undefined ? input.finishedOn : existing.finishedOn);
    return bookRepository.update(id, { ...input, updatedAt: new Date().toISOString() });
  },

  delete(id: string): boolean {
    return bookRepository.delete(id);
  },

  /**
   * Record the page reached on a day. A book on the wish list or dropped is being read again, and
   * the first day logged is when reading started. If the book has a habit and the page moved
   * forward, the habit is done for that day; `completion` is set only when this call ticked it,
   * so undoing the log can untick it. A habit counted in pages also gets that day's pages read as
   * its amount, kept up to date by later logs the same day; `tick` is the day's completion after it.
   */
  log(bookId: string, input: LogReadingInput): { book: BookWithDetails; completion: HabitCompletion | null; tick: HabitCompletion | null } | undefined {
    const book = bookRepository.findById(bookId);

    if (!book) {
      return undefined;
    }

    if (book.pages !== null && input.page > book.pages) {
      throw new InvalidInputError(`Page ${input.page} is past the end. This book has ${book.pages} pages.`);
    }

    const before = book.log.filter((entry) => entry.date < input.date).at(-1)?.page ?? 0;
    const now = new Date().toISOString();
    let completion: HabitCompletion | null = null;
    let tick: HabitCompletion | null = null;

    db.transaction(() => {
      bookRepository.saveEntry({ id: randomUUID(), bookId, date: input.date, page: input.page, createdAt: now });

      const changes: Partial<Book> = {};
      if (book.status === 'want' || book.status === 'dropped') changes.status = 'reading';
      if (!book.startedOn || input.date < book.startedOn) changes.startedOn = input.date;
      if (Object.keys(changes).length) bookRepository.update(bookId, { ...changes, updatedAt: now });

      const habit = book.habitId ? habitRepository.findById(book.habitId) : undefined;
      if (habit?.active && input.page > before) {
        const amount = habit.unit === 'pages' ? input.page - before : null;
        const existing = habitRepository.findCompletion(habit.id, input.date);
        if (!existing) completion = tick = habitRepository.complete({ id: randomUUID(), habitId: habit.id, date: input.date, amount, completedAt: now });
        else tick = habit.unit === 'pages' ? habitRepository.complete({ ...existing, amount }) : existing;
      }
    });

    return { book: bookRepository.findById(bookId)!, completion, tick };
  },

  unlog(bookId: string, date: string): BookWithDetails | undefined {
    if (!bookRepository.findById(bookId) || !bookRepository.deleteEntry(bookId, date)) {
      return undefined;
    }

    return bookRepository.findById(bookId);
  },

  /** A book is borrowed once at a time. Library and renewals default to the book's last loan. */
  addLoan(bookId: string, input: CreateLoanInput): BookWithDetails | undefined {
    const book = bookRepository.findById(bookId);

    if (!book) {
      return undefined;
    }

    if (book.loans.some((loan) => !loan.returnedOn)) {
      throw new ConflictError('This book is already borrowed. Mark it returned before borrowing it again.');
    }

    const last = book.loans.at(-1);
    const now = new Date().toISOString();
    const loan: BookLoan = {
      id: randomUUID(),
      bookId,
      library: input.library ?? last?.library ?? DEFAULT_LIBRARY,
      borrowedOn: input.borrowedOn,
      dueOn: input.dueOn,
      renewedOn: [],
      maxRenewals: input.maxRenewals !== undefined ? input.maxRenewals : last?.maxRenewals ?? null,
      returnedOn: null,
      createdAt: now,
      updatedAt: now,
    };

    checkLoanDates(loan);
    bookRepository.createLoan(loan);
    return bookRepository.findById(bookId);
  },

  updateLoan(bookId: string, loanId: string, input: UpdateLoanInput): BookWithDetails | undefined {
    const book = bookRepository.findById(bookId);
    const loan = book && loanOf(book, loanId);

    if (!loan) {
      return undefined;
    }

    checkLoanDates({ ...loan, ...input });
    bookRepository.updateLoan(loanId, { ...input, updatedAt: new Date().toISOString() });
    return bookRepository.findById(bookId);
  },

  /** Renewing moves the due date later, within the number of renewals the library allows. */
  renewLoan(bookId: string, loanId: string, input: RenewLoanInput): BookWithDetails | undefined {
    const book = bookRepository.findById(bookId);
    const loan = book && loanOf(book, loanId);

    if (!loan) {
      return undefined;
    }

    if (loan.returnedOn) {
      throw new ConflictError('This loan is already returned');
    }

    if (loan.maxRenewals !== null && loan.renewedOn.length >= loan.maxRenewals) {
      throw new ConflictError(`No renewals left. ${loan.library} allows ${loan.maxRenewals}.`);
    }

    if (input.dueOn <= loan.dueOn) {
      throw new InvalidInputError(`The new due date must be after the current one (${loan.dueOn})`);
    }

    bookRepository.updateLoan(loanId, { dueOn: input.dueOn, renewedOn: [...loan.renewedOn, input.date], updatedAt: new Date().toISOString() });
    return bookRepository.findById(bookId);
  },

  deleteLoan(bookId: string, loanId: string): BookWithDetails | undefined {
    const book = bookRepository.findById(bookId);

    if (!book || !loanOf(book, loanId)) {
      return undefined;
    }

    bookRepository.deleteLoan(loanId);
    return bookRepository.findById(bookId);
  },
};
