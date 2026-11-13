import Supplier from '../models/Supplier.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import { HttpError } from '../utils/http.js';
import { cleanStr, escapeRegex } from '../utils/validate.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function findOrThrow(id) {
  const s = await Supplier.findById(id);
  if (!s) throw new HttpError(404, 'Supplier not found');
  return s;
}

function parse(body, partial) {
  const out = {};
  const has = (k) => body[k] !== undefined;
  if (!partial || has('name')) {
    out.name = cleanStr(body.name);
    if (!out.name) throw new HttpError(400, 'Supplier name is required');
  }
  ['contactPerson', 'phone', 'address'].forEach((k) => { if (has(k)) out[k] = cleanStr(body[k]); });
  if (has('email')) {
    out.email = cleanStr(body.email).toLowerCase();
    if (out.email && !EMAIL_RE.test(out.email)) throw new HttpError(400, 'Invalid email');
  }
  return out;
}

export const supplierService = {
  async list({ search } = {}) {
    const filter = {};
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: rx }, { contactPerson: rx }, { email: rx }, { phone: rx }, { address: rx }];
    }
    return Supplier.find(filter).collation({ locale: 'en' }).sort({ name: 1 });
  },

  get: (id) => findOrThrow(id),

  async create(body) {
    return Supplier.create(parse(body, false));
  },

  async update(id, body) {
    const supplier = await findOrThrow(id);
    Object.assign(supplier, parse(body, true));
    await supplier.save();
    return supplier;
  },

  async remove(id) {
    const supplier = await findOrThrow(id);
    if (await PurchaseOrder.exists({ supplierId: id })) {
      throw new HttpError(409, 'Cannot delete a supplier that has purchase orders');
    }
    await supplier.deleteOne();
  },
};
