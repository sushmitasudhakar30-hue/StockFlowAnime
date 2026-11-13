/** Shared by sales orders and purchase orders: validate + price the order lines. */
import Product from '../models/Product.js';
import { HttpError } from '../utils/http.js';
import { nonNegativeNumber, positiveInt, requireId } from '../utils/validate.js';

/**
 * rawItems: [{ productId, qty, price? }]  →  { items, total }
 * price is optional: when left out, the product's current price is used.
 */
export async function buildItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new HttpError(400, 'Add at least one item');

  const ids = rawItems.map((it, i) => requireId(it?.productId, `Product on line ${i + 1}`));
  const products = await Product.find({ _id: { $in: ids } });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items = rawItems.map((it, i) => {
    const product = byId.get(ids[i]);
    if (!product) throw new HttpError(404, `Product on line ${i + 1} not found`);
    const hasPrice = it.price !== undefined && it.price !== null && it.price !== '';
    return {
      productId: product._id,
      qty: positiveInt(it.qty, `Quantity on line ${i + 1}`),
      price: hasPrice ? nonNegativeNumber(it.price, `Price on line ${i + 1}`) : product.price,
    };
  });

  return { items, total: items.reduce((sum, it) => sum + it.qty * it.price, 0) };
}

/** Highest number in strings like "SO-1006" (floor = value to start from when nothing exists yet) */
export const highestNumber = (docs, field, floor) =>
  docs.reduce((max, d) => {
    const n = parseInt(String(d[field]).replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, floor);
