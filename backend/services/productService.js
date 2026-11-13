import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import WarehouseInventory from '../models/WarehouseInventory.js';
import { HttpError } from '../utils/http.js';
import { cleanStr, escapeRegex, nonNegativeNumber } from '../utils/validate.js';
import { totalStock, stockStatus } from './stockService.js';

const duplicateSku = (sku) => new HttpError(409, `SKU "${sku}" already exists`);

// JSON for the client = the stored product + two handy computed fields
const present = (product) => ({ ...product.toJSON(), totalStock: totalStock(product), stockStatus: stockStatus(product) });

async function findOrThrow(id) {
  const product = await Product.findById(id);
  if (!product) throw new HttpError(404, 'Product not found');
  return product;
}

const skuTaken = (sku, exceptId) =>
  Product.exists({ sku: new RegExp(`^${escapeRegex(sku)}$`, 'i'), ...(exceptId ? { _id: { $ne: exceptId } } : {}) });

function parse(body, partial) {
  const out = {};
  const has = (k) => body[k] !== undefined;

  if (!partial || has('sku')) {
    out.sku = cleanStr(body.sku);
    if (!out.sku) throw new HttpError(400, 'SKU is required');
  }
  if (!partial || has('name')) {
    out.name = cleanStr(body.name);
    if (!out.name) throw new HttpError(400, 'Product name is required');
  }
  if (!partial || has('category')) {
    out.category = cleanStr(body.category);
    if (!out.category) throw new HttpError(400, 'Category is required');
  }
  if (!partial || has('price')) out.price = nonNegativeNumber(body.price, 'Price');
  if (!partial || has('reorderLevel')) {
    out.reorderLevel = body.reorderLevel === undefined ? 0 : nonNegativeNumber(body.reorderLevel, 'Reorder level');
  }
  return out;
}

const normalizeStatus = (s) => String(s).toLowerCase().replace(/[\s_]+/g, '-'); // "Low stock" → "low-stock"

export const productService = {
  /** Filters (all optional): search (name/SKU), category, status = in-stock | low-stock | out-of-stock */
  async list({ search, category, status } = {}) {
    const filter = {};
    if (category) filter.category = String(category); // String() so a query like ?category[$ne]=x cannot inject a MongoDB operator
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: rx }, { sku: rx }];
    }
    let products = await Product.find(filter).collation({ locale: 'en' }).sort({ name: 1 });
    if (status) {
      const wanted = normalizeStatus(status);
      products = products.filter((p) => normalizeStatus(stockStatus(p)) === wanted);
    }
    return products.map(present);
  },

  async get(id) {
    return present(await findOrThrow(id));
  },

  async categories() {
    return (await Product.distinct('category')).sort((a, b) => a.localeCompare(b));
  },

  async create(body) {
    const data = parse(body, false);
    if (await skuTaken(data.sku)) throw duplicateSku(data.sku);
    try {
      return present(await Product.create({ ...data, warehouseStock: {} }));
    } catch (err) {
      if (err.code === 11000) throw duplicateSku(data.sku);
      throw err;
    }
  },

  async update(id, body) {
    const product = await findOrThrow(id);
    const data = parse(body, true);
    if (data.sku !== undefined && (await skuTaken(data.sku, id))) throw duplicateSku(data.sku);
    Object.assign(product, data);
    try {
      await product.save();
    } catch (err) {
      if (err.code === 11000) throw duplicateSku(data.sku);
      throw err;
    }
    return present(product);
  },

  async remove(id) {
    const product = await findOrThrow(id);
    await product.deleteOne();
    // keep the movement history, just detach it from the deleted product
    await StockMovement.updateMany({ productId: id }, { productId: null });
    // the product no longer exists, so remove its rack/bin placements too
    await WarehouseInventory.deleteMany({ productId: id });
  },
};
