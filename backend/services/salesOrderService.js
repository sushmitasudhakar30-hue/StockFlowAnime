/**
 * Sales orders — same workflow as the React app:
 *   Pending → (confirm: stock is deducted) Confirmed → Shipped → Delivered
 *   Cancel (Pending/Confirmed) and Return (Delivered) put stock back. Delete puts stock back if it was deducted.
 */
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import SalesOrder, { SALES_STATUSES } from '../models/SalesOrder.js';
import { HttpError } from '../utils/http.js';
import { cleanStr, dateString, dayOf, escapeRegex, inRange } from '../utils/validate.js';
import { nextSequence } from '../utils/sequence.js';
import { buildItems, highestNumber } from './orderHelpers.js';
import { applyStockChanges, checkLowStockMany, getDefaultWarehouse, logMovements, resolveWarehouse } from './stockService.js';

const HOLDS_STOCK = ['Confirmed', 'Shipped', 'Delivered'];

async function findOrThrow(id) {
  const order = await SalesOrder.findById(id);
  if (!order) throw new HttpError(404, 'Order not found');
  return order;
}

/**
 * Atomically move an order from one of `fromStatuses` to a new state. Returns the order AS IT WAS before.
 * (Doing the status change first means two people clicking "Confirm" together can never both deduct stock.)
 */
async function claim(id, fromStatuses, patch, action) {
  const before = await SalesOrder.findOneAndUpdate({ _id: id, status: { $in: fromStatuses } }, patch, { new: false });
  if (before) return before;
  const existing = await findOrThrow(id);
  throw new HttpError(400, `Cannot ${action}: order ${existing.orderNumber} is ${existing.status} (allowed from: ${fromStatuses.join(' / ')})`);
}

const revert = (before) =>
  SalesOrder.updateOne({ _id: before._id }, { status: before.status, warehouseId: before.warehouseId }).catch(() => {});

/** Throws a friendly error if the warehouse cannot cover every line of the order. */
async function assertStockAvailable(items, warehouseId) {
  const need = new Map();
  items.forEach((it) => need.set(String(it.productId), (need.get(String(it.productId)) || 0) + it.qty));
  const products = await Product.find({ _id: { $in: [...need.keys()] } });
  for (const [productId, qty] of need) {
    const product = products.find((p) => String(p._id) === productId);
    if (!product) throw new HttpError(400, 'A product in this order no longer exists');
    const have = Number(product.warehouseStock?.[warehouseId]) || 0;
    if (qty > have) throw new HttpError(400, `Insufficient stock for ${product.name}: need ${qty}, have ${have}`);
  }
}

/** Put the order's items back into stock (warehouse it was taken from, or the default one). */
async function restock(order, currentUser, label) {
  let wh = order.warehouseId ? await Warehouse.findById(order.warehouseId) : null;
  if (!wh) wh = await getDefaultWarehouse();
  if (!wh) throw new HttpError(400, 'No warehouse available to restock into');
  const warehouseId = String(wh._id);

  await applyStockChanges(order.items.map((it) => ({ productId: String(it.productId), warehouseId, delta: it.qty })));
  await logMovements(
    order.items.map((it) => ({
      type: 'Stock In',
      productId: it.productId,
      warehouseId,
      qty: it.qty,
      user: currentUser.name,
      note: `${label}: ${order.orderNumber}`,
    }))
  );
}

const fresh = (id) => findOrThrow(id);

export const salesOrderService = {
  /** Filters (optional): status, from, to (YYYY-MM-DD), customer, search (order # or customer) */
  async list({ status, from, to, customer, search } = {}) {
    const filter = {};
    if (status) {
      if (!SALES_STATUSES.includes(status)) throw new HttpError(400, `status must be one of: ${SALES_STATUSES.join(', ')}`);
      filter.status = status;
    }
    if (customer) filter.customer = new RegExp(escapeRegex(customer), 'i');
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ orderNumber: rx }, { customer: rx }];
    }
    const orders = await SalesOrder.find(filter).sort({ date: -1, createdAt: -1, _id: -1 });
    return from || to ? orders.filter((o) => inRange(dayOf(o.date), from, to)) : orders;
  },

  get: findOrThrow,

  /** body: { customer, date?, items: [{ productId, qty, price? }] } */
  async create(body) {
    const customer = cleanStr(body.customer);
    if (!customer) throw new HttpError(400, 'Customer name is required');
    const date = dateString(body.date);
    const { items, total } = await buildItems(body.items);

    const n = await nextSequence('salesOrder', async () =>
      highestNumber(await SalesOrder.find({}, 'orderNumber').lean(), 'orderNumber', 1000)
    );
    return SalesOrder.create({ orderNumber: `SO-${n}`, customer, date, status: 'Pending', items, total });
  },

  /** Only Pending orders can be edited (stock has not been deducted yet). */
  async update(id, body) {
    await findOrThrow(id);
    const customer = cleanStr(body.customer);
    if (!customer) throw new HttpError(400, 'Customer name is required');
    const date = dateString(body.date);
    const { items, total } = await buildItems(body.items);

    const updated = await SalesOrder.findOneAndUpdate(
      { _id: id, status: 'Pending' },
      { customer, date, items, total },
      { new: true, runValidators: true }
    );
    if (!updated) throw new HttpError(400, 'Only pending orders can be edited');
    return updated;
  },

  /** Pending → Confirmed. Deducts stock from `warehouseId` (default: first warehouse). */
  async confirm(id, currentUser, warehouseId) {
    const order = await findOrThrow(id);
    if (order.status !== 'Pending') throw new HttpError(400, `Only pending orders can be confirmed (this one is ${order.status})`);

    const wh = await resolveWarehouse(warehouseId);
    const whId = String(wh._id);
    await assertStockAvailable(order.items, whId);

    const before = await claim(id, ['Pending'], { status: 'Confirmed', warehouseId: wh._id }, 'confirm');
    let lowStock = [];
    try {
      const updatedProducts = await applyStockChanges(
        before.items.map((it) => ({ productId: String(it.productId), warehouseId: whId, delta: -it.qty }))
      );
      await logMovements(
        before.items.map((it) => ({
          type: 'Stock Out',
          productId: it.productId,
          warehouseId: whId,
          qty: it.qty,
          user: currentUser.name,
          note: `Order confirmed: ${before.orderNumber}`,
        }))
      );
      lowStock = await checkLowStockMany(updatedProducts);
    } catch (err) {
      await revert(before);
      throw err;
    }
    return { order: await fresh(id), warehouse: wh.name, lowStock };
  },

  async ship(id) {
    await claim(id, ['Confirmed'], { status: 'Shipped' }, 'ship');
    return fresh(id);
  },

  async deliver(id) {
    await claim(id, ['Shipped'], { status: 'Delivered' }, 'mark as delivered');
    return fresh(id);
  },

  /** Cancel a Pending or Confirmed order. Confirmed orders get their stock back. */
  async cancel(id, currentUser) {
    const before = await claim(id, ['Pending', 'Confirmed'], { status: 'Cancelled' }, 'cancel');
    if (HOLDS_STOCK.includes(before.status)) {
      try {
        await restock(before, currentUser, 'Order cancelled');
      } catch (err) {
        await revert(before);
        throw err;
      }
    }
    return fresh(id);
  },

  /** Delivered → Returned. Items go back into stock. */
  async returnOrder(id, currentUser) {
    const before = await claim(id, ['Delivered'], { status: 'Returned' }, 'mark as returned');
    try {
      await restock(before, currentUser, 'Order returned');
    } catch (err) {
      await revert(before);
      throw err;
    }
    return fresh(id);
  },

  /** Delete any order. If it was holding stock (Confirmed/Shipped/Delivered) the stock is put back first. */
  async remove(id, currentUser) {
    const order = await findOrThrow(id);
    const holdsStock = HOLDS_STOCK.includes(order.status);
    const deleted = await SalesOrder.findOneAndDelete({ _id: id, status: order.status });
    if (!deleted) throw new HttpError(409, 'The order changed while deleting — please try again');
    if (holdsStock) {
      try {
        await restock(deleted, currentUser, 'Order deleted');
      } catch (err) {
        await SalesOrder.create(deleted.toObject()).catch(() => {}); // could not restock → bring the order back
        throw err;
      }
    }
    return { success: true, stockRestored: holdsStock };
  },
};
