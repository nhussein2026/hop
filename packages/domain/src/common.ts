/**
 * Common domain primitives shared across Hop.
 *
 * These aliases make intent clearer without coupling the domain
 * to any particular database or validation library.
 */

export type EntityId = string;

/**
 * Calendar date in YYYY-MM-DD format.
 *
 * Example:
 * 2026-09-14
 */
export type ISODate = string;

/**
 * ISO-8601 date/time.
 *
 * Example:
 * 2026-09-14T15:30:00.000Z
 */
export type ISODateTime = string;