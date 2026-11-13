import { HttpError } from '../utils/http.js';
import { isId } from '../utils/validate.js';

/** router.param handler → rejects ":id" values that are not valid MongoDB ObjectIds with a clean 400 */
const checkParam = (_req, _res, next, value, name) =>
  isId(value) ? next() : next(new HttpError(400, `Invalid ${name} in the URL`));

export function validateParams(router, ...names) {
  names.forEach((n) => router.param(n, checkParam));
}
