/**
 * stockService.js — the ONE place that changes stock quantities.
 *
 * Every change is an atomic MongoDB $inc, and a decrease only succeeds when enough stock is there
 * (so two people can never take the same last unit). Multi-product operations (an order with 3 items)
 * are applied one by one and rolled back if any step fails.
 */
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import StockMovement from '../models/StockMovement.js';
import { HttpError } from '../utils/http.js';
import { requireId } from '../utils/validate.js';
import { notificationService } from './notificationService.js';

export const totalStock = (product) =>
  Object.values(product.warehouseStock || {}).reduce((sum, q) => sum + (Number(q) || 0), 0);

export function stockStatus(product) {
  const total = totalStock(product);
  if (total === 0) return 'Out of stock';
  if (total <= (product.reorderLevel ?? 0)) return 'Low stock';
  return 'In stock';
}

/** The warehouse used when the caller does not say which one (first by name — same rule as the React app). */
export const getDefaultWarehouse = () => Warehouse.findOne().collation({ locale: 'en' }).sort({ name: 1 });

/** Returns a Warehouse document: the requested one, or the default one. */
export async function resolveWarehouse(warehouseId) {
  if (warehouseId) {
    const wh = await Warehouse.findById(requireId(warehouseId, 'Warehouse'));
    if (!wh) throw new HttpError(404, 'Warehouse not found');
    return wh;
  }
  const wh = await getDefaultWarehouse();
  if (!wh) throw new HttpError(400, 'No warehouse available — create a warehouse first');
  return wh;
}

/** Change one product's stock in one warehouse by +/- delta. Returns the updated product. */
export async function adjustStock(productId, warehouseId, delta) {
  const key = `warehouseStock.${warehouseId}`;
  const filter = { _id: productId };
  if (delta < 0) filter[key] = { $gte: -delta }; // only if enough stock is there

  const updated = await Product.findOneAndUpdate(filter, { $inc: { [key]: delta } }, { new: true });
  if (updated) return updated;

  const product = await Product.findById(productId);
  if (!product) throw new HttpError(404, 'Product not found');
  const have = Number(product.warehouseStock?.[warehouseId]) || 0;
  throw new HttpError(400, `Insufficient stock for ${product.name}: need ${-delta}, have ${have}`);
}

/**
 * Apply several changes: [{ productId, warehouseId, delta }].
 * If one fails, the ones already applied are reversed and the error is thrown.
 * Returns a Map(productId → latest product document).
 */
export async function applyStockChanges(changes) {
  const applied = [];
  const latest = new Map();
  try {
    for (const c of changes) {
      const product = await adjustStock(c.productId, c.warehouseId, c.delta);
      applied.push(c);
      latest.set(String(c.productId), product);
    }
    return latest;
  } catch (err) {
    for (const c of applied.reverse()) {
      await adjustStock(c.productId, c.warehouseId, -c.delta).catch(() => {});
    }
    throw err;
  }
}

/** Write rows to the stock_movements history. Each: { type, productId, warehouseId?, fromWarehouseId?, toWarehouseId?, qty, user, note } */
export async function logMovements(rows) {
  if (!rows.length) return [];
  return StockMovement.insertMany(
    rows.map((m) => ({
      type: m.type,
      productId: m.productId,
      warehouseId: m.warehouseId || null,
      fromWarehouseId: m.fromWarehouseId || null,
      toWarehouseId: m.toWarehouseId || null,
      qty: m.qty,
      user: m.user || '',
      note: m.note || '',
      date: new Date(),
    }))
  );
}

/** Creates a "Low Stock / Out of Stock" notification when a product is at or below its reorder level. */
export async function checkLowStock(product) {
  const total = totalStock(product);
  if (total > (product.reorderLevel ?? 0)) return false;
  await notificationService.create({
    type: 'low_stock',
    title: total === 0 ? `Out of Stock: ${product.name}` : `Low Stock: ${product.name}`,
    message: `Total stock is ${total} (reorder at ${product.reorderLevel})`,
    dedupe: true,
  });
  return true;
}

/** Runs checkLowStock for every product in a Map from applyStockChanges. Returns the names that are low. */
export async function checkLowStockMany(productMap) {
  const low = [];
  for (const product of productMap.values()) {
    if (await checkLowStock(product)) low.push(product.name);
  }
  return low;
}
