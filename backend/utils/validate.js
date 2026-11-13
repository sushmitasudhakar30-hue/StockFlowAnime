/** Tiny validation helpers (no extra libraries needed). All throw HttpError(400) with a readable message. */
import { HttpError } from './http.js';

export const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isId = (v) => typeof v === 'string' && OBJECT_ID_RE.test(v);
export const cleanStr = (v) => String(v ?? '').trim();
export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => ymd(new Date());

export function requireId(value, label = 'Id') {
  const v = String(value ?? '');
  if (!isId(v)) throw new HttpError(400, `${label} is missing or invalid`);
  return v;
}

export function positiveInt(value, label = 'Quantity') {
  const n = Number(value);
  if (value === '' || value === null || !Number.isInteger(n) || n <= 0) {
    throw new HttpError(400, `${label} must be a positive whole number`);
  }
  return n;
}

export function nonNegativeNumber(value, label = 'Value') {
  const n = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(n) || n < 0) {
    throw new HttpError(400, `${label} must be a number that is 0 or more`);
  }
  return n;
}

/** Accepts "YYYY-MM-DD". Empty → today. */
export function dateString(value, label = 'Date') {
  if (value === undefined || value === null || value === '') return todayStr();
  const v = String(value).trim();
  if (!DATE_RE.test(v) || Number.isNaN(Date.parse(v))) {
    throw new HttpError(400, `${label} must be in YYYY-MM-DD format`);
  }
  return v;
}

/** YYYY-MM-DD of a Date or ISO string (used by report date filters). */
export const dayOf = (d) => (d instanceof Date ? d.toISOString() : String(d || '')).slice(0, 10);
export const inRange = (date, from, to) => {
  const d = dayOf(date);
  return (!from || d >= from) && (!to || d <= to);
};
