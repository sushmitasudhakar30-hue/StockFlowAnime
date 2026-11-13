/**
 * userService.js (backend) — all the user/role business rules live here.
 * The controller only passes data in and sends the result out.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { ROLES } from '../models/User.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const initials = (name) =>
  name.trim().split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase();

async function findOrThrow(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'User not found');
  const user = await User.findById(id);
  if (!user) throw new HttpError(404, 'User not found');
  return user;
}

/** Number of OTHER active admins (used to protect the last admin). */
const otherActiveAdmins = (id) =>
  User.countDocuments({ role: 'Admin', active: true, _id: { $ne: id } });

const duplicateEmail = (email) => new HttpError(409, `Email "${email}" is already in use`);

export const userService = {
  async list() {
    return User.find().collation({ locale: 'en' }).sort({ name: 1 });
  },

  async create({ name, email, password, role, avatar }) {
    if (!name?.trim()) throw new HttpError(400, 'Name is required');
    if (!email || !EMAIL_RE.test(email.trim())) throw new HttpError(400, 'Invalid email');
    if (!password || password.length < 6) throw new HttpError(400, 'Password must be 6+ chars');
    if (role && !ROLES.includes(role)) throw new HttpError(400, 'Invalid role');

    const cleanEmail = email.trim().toLowerCase();
    if (await User.exists({ email: cleanEmail })) throw duplicateEmail(email.trim());

    try {
      return await User.create({
        name: name.trim(),
        email: cleanEmail,
        password: await bcrypt.hash(password, 10),
        role: role || 'Inventory Staff',
        active: true,
        avatar: avatar || initials(name),
      });
    } catch (err) {
      if (err.code === 11000) throw duplicateEmail(email.trim());
      throw err;
    }
  },

  async update(id, updates, currentUserId) {
    const user = await findOrThrow(id);

    if (updates.name !== undefined) {
      if (!updates.name.trim()) throw new HttpError(400, 'Name is required');
      user.name = updates.name.trim();
      user.avatar = initials(user.name);
    }

    if (updates.email !== undefined) {
      if (!EMAIL_RE.test(updates.email.trim())) throw new HttpError(400, 'Invalid email');
      const cleanEmail = updates.email.trim().toLowerCase();
      if (await User.exists({ email: cleanEmail, _id: { $ne: id } })) {
        throw duplicateEmail(updates.email.trim());
      }
      user.email = cleanEmail;
    }

    if (updates.role !== undefined) {
      if (!ROLES.includes(updates.role)) throw new HttpError(400, 'Invalid role');
      if (user.role === 'Admin' && updates.role !== 'Admin' && user.active) {
        if ((await otherActiveAdmins(id)) === 0) {
          throw new HttpError(400, 'You cannot remove the role of the last Admin');
        }
      }
      user.role = updates.role;
    }

    if (updates.password) {
      if (updates.password.length < 6) throw new HttpError(400, 'Password must be 6+ chars');
      user.password = await bcrypt.hash(updates.password, 10);
    }

    try {
      await user.save();
    } catch (err) {
      if (err.code === 11000) throw duplicateEmail(updates.email);
      throw err;
    }
    return user;
  },

  async toggleActive(id, currentUserId) {
    const user = await findOrThrow(id);
    if (String(user._id) === String(currentUserId) && user.active) {
      throw new HttpError(400, "You can't deactivate your own account");
    }
    if (user.role === 'Admin' && user.active && (await otherActiveAdmins(id)) === 0) {
      throw new HttpError(400, 'You cannot deactivate the last Admin account');
    }
    user.active = !user.active;
    await user.save();
    return user;
  },

  async remove(id, currentUserId) {
    const user = await findOrThrow(id);
    if (String(user._id) === String(currentUserId)) {
      throw new HttpError(400, "You can't delete your own account");
    }
    if (user.role === 'Admin' && (await User.countDocuments({ role: 'Admin', _id: { $ne: id } })) === 0) {
      throw new HttpError(400, 'You cannot delete the last Admin account');
    }
    await user.deleteOne();
  },

  /** Checks email + password, returns { token, user } */
  async login(email, password) {
    if (!email || !password) throw new HttpError(400, 'Email and password are required');
    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(String(password), user.password))) {
      throw new HttpError(401, 'Invalid credentials');
    }
    if (!user.active) throw new HttpError(403, 'Account is deactivated');

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '8h' });
    return { token, user };
  },
};
