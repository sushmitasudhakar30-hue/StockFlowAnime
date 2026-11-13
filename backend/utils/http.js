/** Small shared HTTP helpers used by every service/controller. */

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Lets us write async route handlers without try/catch — errors go to the central error handler in server.js */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
