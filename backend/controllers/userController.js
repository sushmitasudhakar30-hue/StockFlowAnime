import { userService } from '../services/userService.js';

// Lets us write async handlers without try/catch — errors go to server.js error handler
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ----- Auth -----
export const login = wrap(async (req, res) => {
  const { email, password } = req.body || {};
  res.json(await userService.login(email, password));
});

export const me = wrap(async (req, res) => {
  res.json({ user: req.user });
});

// ----- User management (Admin only) -----
export const getUsers = wrap(async (_req, res) => {
  res.json(await userService.list());
});

export const createUser = wrap(async (req, res) => {
  const created = await userService.create(req.body || {});
  res.status(201).json(created);
});

export const updateUser = wrap(async (req, res) => {
  res.json(await userService.update(req.params.id, req.body || {}, req.user.id));
});

export const toggleUser = wrap(async (req, res) => {
  res.json(await userService.toggleActive(req.params.id, req.user.id));
});

export const deleteUser = wrap(async (req, res) => {
  await userService.remove(req.params.id, req.user.id);
  res.json({ success: true });
});
