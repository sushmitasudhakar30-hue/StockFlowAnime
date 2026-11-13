import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/** Requires a valid "Authorization: Bearer <token>" header. Puts the user on req.user */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not logged in' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.active) {
      return res.status(401).json({ message: 'Session is no longer valid' });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Session expired — please sign in again' });
  }
}

/** Only lets the listed roles through, e.g. requireRole('Admin') */
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'You do not have permission to do this' });
  }
  next();
};
