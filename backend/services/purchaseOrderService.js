/** Purchase orders: Pending → Received (receiving adds the items to stock) or Pending → Cancelled. */
import PurchaseOrder, { PO_STATUSES } from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import { HttpError } from '../utils/http.js';
import { dateString, dayOf, inRange, requireId } from '../utils/validate.js';
import { nextSequence } from '../utils/sequence.js';
import { buildItems, highestNumber } from './orderHelpers.js';
import { applyStockChanges, logMovements, resolveWarehouse } from './stockService.js';

async function findOrThrow(id) {
  const po = await PurchaseOrder.findById(id);
  if (!po) throw new HttpError(404, 'Purchase order not found');
  return po;
}

/** Adds supplierName (looked up live, so a renamed supplier shows the new name — same as the React app). */
async function withSupplierNames(orders) {
  const ids = [...new Set(orders.map((o) => String(o.supplierId)))];
  const suppliers = await Supplier.find({ _id: { $in: ids } }, 'name');
  const names = new Map(suppliers.map((s) => [String(s._id), s.name]));
  return orders.map((o) => ({ ...o.toJSON(), supplierName: names.get(String(o.supplierId)) || '—' }));
}

const one = async (po) => (await withSupplierNames([po]))[0];

async function assertSupplier(id) {
  const supplierId = requireId(id, 'Supplier');
  if (!(await Supplier.exists({ _id: supplierId }))) throw new HttpError(404, 'Supplier not found');
  return supplierId;
}

export const purchaseOrderService = {
  /** Filters (optional): status, supplierId, from, to */
  async list({ status, supplierId, from, to } = {}) {
    const filter = {};
    if (status) {
      if (!PO_STATUSES.includes(status)) throw new HttpError(400, `status must be one of: ${PO_STATUSES.join(', ')}`);
      filter.status = status;
    }
    if (supplierId) filter.supplierId = requireId(supplierId, 'supplierId');
    let orders = await PurchaseOrder.find(filter).sort({ date: -1, createdAt: -1, _id: -1 });
    if (from || to) orders = orders.filter((o) => inRange(dayOf(o.date), from, to));
    return withSupplierNames(orders);
  },

  async get(id) {
    return one(await findOrThrow(id));
  },

  /** body: { supplierId, date?, items: [{ productId, qty, price? }] } */
  async create(body) {
    const supplierId = await assertSupplier(body.supplierId);
    const date = dateString(body.date);
    const { items, total } = await buildItems(body.items);
    const n = await nextSequence('purchaseOrder', async () =>
      highestNumber(await PurchaseOrder.find({}, 'poNumber').lean(), 'poNumber', 2000)
    );
    return one(await PurchaseOrder.create({ poNumber: `PO-${n}`, supplierId, date, status: 'Pending', items, total }));
  },

  /** Only Pending purchase orders can be edited. */
  async update(id, body) {
    await findOrThrow(id);
    const patch = {};
    if (body.supplierId !== undefined) patch.supplierId = await assertSupplier(body.supplierId);
    if (body.date !== undefined) patch.date = dateString(body.date);
    if (body.items !== undefined) Object.assign(patch, await buildItems(body.items));

    const updated = await PurchaseOrder.findOneAndUpdate({ _id: id, status: 'Pending' }, patch, { new: true, runValidators: true });
    if (!updated) throw new HttpError(400, 'Only pending purchase orders can be edited');
    return one(updated);
  },

  /** Pending → Received and add every item to stock in `warehouseId` (default: first warehouse). */
  async receive(id, currentUser, warehouseId) {
    await findOrThrow(id);
    const wh = await resolveWarehouse(warehouseId);
    const whId = String(wh._id);

    const before = await PurchaseOrder.findOneAndUpdate(
      { _id: id, status: 'Pending' },
      { status: 'Received', warehouseId: wh._id, receivedAt: new Date() },
      { new: false }
    );
    if (!before) {
      const existing = await findOrThrow(id);
      throw new HttpError(400, `Only pending purchase orders can be received — this one has already been ${existing.status.toLowerCase()}`);
    }

    try {
      await applyStockChanges(before.items.map((it) => ({ productId: String(it.productId), warehouseId: whId, delta: it.qty })));
      await logMovements(
        before.items.map((it) => ({
          type: 'Stock In',
          productId: it.productId,
          warehouseId: whId,
          qty: it.qty,
          user: currentUser.name,
          note: `PO received: ${before.poNumber}`,
        }))
      );
    } catch (err) {
      await PurchaseOrder.updateOne({ _id: id }, { status: 'Pending', warehouseId: null, receivedAt: null }).catch(() => {});
      throw err;
    }
    return { order: await one(await findOrThrow(id)), warehouse: wh.name };
  },

  /** Pending → Cancelled (no stock was added yet, so nothing to undo). */
  async cancel(id) {
    const updated = await PurchaseOrder.findOneAndUpdate({ _id: id, status: 'Pending' }, { status: 'Cancelled' }, { new: true });
    if (!updated) {
      const existing = await findOrThrow(id);
      throw new HttpError(400, `Only pending purchase orders can be cancelled (this one is ${existing.status})`);
    }
    return one(updated);
  },

  /** Pending or Cancelled purchase orders can be deleted (a received one already changed stock). */
  async remove(id) {
    const deleted = await PurchaseOrder.findOneAndDelete({ _id: id, status: { $in: ['Pending', 'Cancelled'] } });
    if (deleted) return;
    await findOrThrow(id);
    throw new HttpError(400, 'A received purchase order cannot be deleted');
  },
};
