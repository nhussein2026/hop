import { and, asc, eq } from 'drizzle-orm';

import type { Book, BookLoan, BookWithDetails, ReadingEntry } from '@hop/domain';

import { db } from '../db/client.js';
import { bookLoans, books, finds, readingLog } from '../db/schema/index.js';

function withDetails(book: Book, loans: BookLoan[], log: ReadingEntry[]): BookWithDetails {
  return { ...book, loans: loans.filter((loan) => loan.bookId === book.id), log: log.filter((entry) => entry.bookId === book.id) };
}

export const bookRepository = {
  findAll(): BookWithDetails[] {
    const loans = db.select().from(bookLoans).orderBy(asc(bookLoans.borrowedOn), asc(bookLoans.createdAt)).all();
    const log = db.select().from(readingLog).orderBy(asc(readingLog.date)).all();
    return db.select().from(books).all().map((book) => withDetails(book, loans, log));
  },

  findById(id: string): BookWithDetails | undefined {
    const book = db.select().from(books).where(eq(books.id, id)).get();
    if (!book) return undefined;
    const loans = db.select().from(bookLoans).where(eq(bookLoans.bookId, id)).orderBy(asc(bookLoans.borrowedOn), asc(bookLoans.createdAt)).all();
    const log = db.select().from(readingLog).where(eq(readingLog.bookId, id)).orderBy(asc(readingLog.date)).all();
    return withDetails(book, loans, log);
  },

  create(book: Book): BookWithDetails {
    db.insert(books).values(book).run();
    return withDetails(book, [], []);
  },

  update(id: string, changes: Partial<Book>): BookWithDetails | undefined {
    db.update(books).set(changes).where(eq(books.id, id)).run();
    return this.findById(id);
  },

  /** The book goes with its loans and reading log. A Radar find it came from stays, unlinked. */
  delete(id: string): boolean {
    return db.transaction((tx) => {
      tx.delete(bookLoans).where(eq(bookLoans.bookId, id)).run();
      tx.delete(readingLog).where(eq(readingLog.bookId, id)).run();
      tx.update(finds).set({ bookId: null }).where(eq(finds.bookId, id)).run();
      return tx.delete(books).where(eq(books.id, id)).run().changes > 0;
    });
  },

  findEntry(bookId: string, date: string): ReadingEntry | undefined {
    return db.select().from(readingLog).where(and(eq(readingLog.bookId, bookId), eq(readingLog.date, date))).get();
  },

  /** One entry per book and day: logging again the same day replaces the page. */
  saveEntry(entry: ReadingEntry) {
    db.insert(readingLog).values(entry).onConflictDoUpdate({ target: [readingLog.bookId, readingLog.date], set: { page: entry.page } }).run();
  },

  deleteEntry(bookId: string, date: string): boolean {
    return db.delete(readingLog).where(and(eq(readingLog.bookId, bookId), eq(readingLog.date, date))).run().changes > 0;
  },

  findLoan(id: string): BookLoan | undefined {
    return db.select().from(bookLoans).where(eq(bookLoans.id, id)).get();
  },

  createLoan(loan: BookLoan) {
    db.insert(bookLoans).values(loan).run();
  },

  updateLoan(id: string, changes: Partial<BookLoan>) {
    db.update(bookLoans).set(changes).where(eq(bookLoans.id, id)).run();
  },

  deleteLoan(id: string): boolean {
    return db.delete(bookLoans).where(eq(bookLoans.id, id)).run().changes > 0;
  },
};
