/** The request conflicts with data that already exists (HTTP 409). */
export class ConflictError extends Error {}

/** The request could not be read, such as a malformed or oversized body (HTTP 400/413). */
export class RequestError extends Error {
  constructor(readonly status: 400 | 413, message: string) {
    super(message);
  }
}
