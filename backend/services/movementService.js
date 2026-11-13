import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import StockMovement, { MOVEMENT_TYPES } from '../models/StockMovement.js';
import { HttpError } from '../utils/http.js';
import { cleanStr, dayOf, inRange, positiveInt, requireId } from '../utils/validate.js';
import { adjustStock, applyStockChanges, checkLowStock, logMovements, totalStock } from './stockService.js';

async function assertWarehouse(id, label) {
  if (!(await Warehouse.exists({ _id: id }))) throw new HttpError(404, `${label} not found`);
}

export const movementService = {
  /** Filters (optional): type, productId, warehouseId (matches from/to too), from, to (YYYY-MM-DD), limit */
  async list({ type, productId, warehouseId, from, to, limit } = {}) {
    const filter = {};
    if (type) {
      if (!MOVEMENT_TYPES.includes(type)) throw new HttpError(400, `type must be one of: ${MOVEMENT_TYPES.join(', ')}`);
      filter.type = type;
    }
    if (productId) filter.productId = requireId(productId, 'productId');
    if (warehouseId) {
      const w = requireId(warehouseId, 'warehouseId');
      filter.$or = [{ warehouseId: w }, { fromWarehouseId: w }, { toWarehouseId: w }];
    }
    let rows = await StockMovement.find(filter).sort({ date: -1, _id: -1 });
    if (from || to) rows = rows.filter((m) => inRange(dayOf(m.date), from, to));
    const max = Number(limit);
    return Number.isInteger(max) && max > 0 ? rows.slice(0, max) : rows;
  },

  async get(id) {
    const m = await StockMovement.findById(id);
    if (!m) throw new HttpError(404, 'Stock movement not found');
    return m;
  },

  /**
   * Record a stock movement AND change the stock.
   *  Stock In  : { type, productId, warehouseId, qty, note }
   *  Stock Out : { type, productId, warehouseId, qty, note }
   *  Damaged   : { type, productId, warehouseId, qty, reason }
   *  Transfer  : { type, productId, fromWarehouseId, toWarehouseId, qty, note }
   */
  async create(body, currentUser) {
    const { type } = body;
    if (!MOVEMENT_TYPES.includes(type)) {
      throw new HttpError(400, `type must be one of: ${MOVEMENT_TYPES.join(', ')}`);
    }
    const productId = requireId(body.productId, 'Product');
    const qty = positiveInt(body.qty, 'Quantity');
    const note = cleanStr(type === 'Damaged' ? body.reason ?? body.note : body.note);

    if (!(await Product.exists({ _id: productId }))) throw new HttpError(404, 'Product not found');

    const row = { type, productId, qty, user: currentUser.name, note };
    let product;

    if (type === 'Transfer') {
      const from = requireId(body.fromWarehouseId, 'Source warehouse');
      const to = requireId(body.toWarehouseId, 'Destination warehouse');
      if (from === to) throw new HttpError(400, 'Source and destination must be different');
      await assertWarehouse(from, 'Source warehouse');
      await assertWarehouse(to, 'Destination warehouse');

      const result = await applyStockChanges([
        { productId, warehouseId: from, delta: -qty },
        { productId, warehouseId: to, delta: qty },
      ]);
      product = result.get(productId);
      Object.assign(row, { fromWarehouseId: from, toWarehouseId: to });
    } else {
      const warehouseId = requireId(body.warehouseId, 'Warehouse');
      await assertWarehouse(warehouseId, 'Warehouse');
      const delta = type === 'Stock In' ? qty : -qty; // Stock Out and Damaged both reduce stock
      product = await adjustStock(productId, warehouseId, delta);
      row.warehouseId = warehouseId;
    }

    let movement;
    try {
      [movement] = await logMovements([row]);
    } catch (err) {
      // history could not be written → undo the stock change so the two never disagree
      if (type === 'Transfer') {
        await adjustStock(productId, row.fromWarehouseId, qty).catch(() => {});
        await adjustStock(productId, row.toWarehouseId, -qty).catch(() => {});
      } else {
        await adjustStock(productId, row.warehouseId, type === 'Stock In' ? -qty : qty).catch(() => {});
      }
      throw err;
    }

    // only Stock Out / Damaged can push a product below its reorder level (Stock In and Transfer keep or raise the total)
    const lowStock = type === 'Stock Out' || type === 'Damaged' ? await checkLowStock(product) : false;
    return { movement, product: { ...product.toJSON(), totalStock: totalStock(product) }, lowStock };
  },
};
