import Warehouse from '../models/Warehouse.js';
import Product from '../models/Product.js';
import Rack from '../models/Rack.js';
import Bin from '../models/Bin.js';
import WarehouseInventory from '../models/WarehouseInventory.js';
import StockMovement from '../models/StockMovement.js';
import { HttpError } from '../utils/http.js';
import { cleanStr, escapeRegex, nonNegativeNumber, positiveInt, requireId } from '../utils/validate.js';

const dupName = (name) => new HttpError(409, `A warehouse named "${name}" already exists`);

async function findOrThrow(id) {
  const wh = await Warehouse.findById(id);
  if (!wh) throw new HttpError(404, 'Warehouse not found');
  return wh;
}

const nameTaken = (name, exceptId) =>
  Warehouse.exists({ name: new RegExp(`^${escapeRegex(name)}$`, 'i'), ...(exceptId ? { _id: { $ne: exceptId } } : {}) });

function parse(body, partial) {
  const out = {};
  const has = (k) => body[k] !== undefined;
  if (!partial || has('name')) {
    out.name = cleanStr(body.name);
    if (!out.name) throw new HttpError(400, 'Warehouse name is required');
  }
  if (!partial || has('location')) {
    out.location = cleanStr(body.location);
    if (!out.location) throw new HttpError(400, 'Location is required');
  }
  if (!partial || has('capacity')) {
    out.capacity = nonNegativeNumber(body.capacity, 'Capacity');
    if (out.capacity < 1) throw new HttpError(400, 'Capacity must be at least 1');
  }
  return out;
}

/** units currently stored per warehouse, taken from the products' warehouseStock */
async function unitsByWarehouse() {
  const products = await Product.find({}, 'warehouseStock').lean();
  const map = {};
  products.forEach((p) =>
    Object.entries(p.warehouseStock || {}).forEach(([wh, qty]) => { map[wh] = (map[wh] || 0) + (Number(qty) || 0); })
  );
  return map;
}

const present = (wh, units) => ({
  ...wh.toJSON(),
  units: units[String(wh._id)] || 0,
  utilization: wh.capacity ? Math.round(((units[String(wh._id)] || 0) / wh.capacity) * 1000) / 10 : 0, // %
});

export const warehouseService = {
  /* ------------------------------ warehouses ------------------------------ */
  async list() {
    const [list, units] = await Promise.all([
      Warehouse.find().collation({ locale: 'en' }).sort({ name: 1 }),
      unitsByWarehouse(),
    ]);
    return list.map((w) => present(w, units));
  },

  async get(id) {
    return present(await findOrThrow(id), await unitsByWarehouse());
  },

  async create(body) {
    const data = parse(body, false);
    if (await nameTaken(data.name)) throw dupName(data.name);
    try {
      const wh = await Warehouse.create({ ...data, locations: [] });
      return present(wh, {});
    } catch (err) {
      if (err.code === 11000) throw dupName(data.name);
      throw err;
    }
  },

  async update(id, body) {
    const wh = await findOrThrow(id);
    const data = parse(body, true);
    if (data.name !== undefined && (await nameTaken(data.name, id))) throw dupName(data.name);
    Object.assign(wh, data);
    try {
      await wh.save();
    } catch (err) {
      if (err.code === 11000) throw dupName(data.name);
      throw err;
    }
    return present(wh, await unitsByWarehouse());
  },

  /** Deleting a warehouse also removes its stock from products, its racks/bins/entries; history is kept. */
  async remove(id) {
    const wh = await findOrThrow(id);
    await wh.deleteOne();
    await Product.updateMany({}, { $unset: { [`warehouseStock.${id}`]: '' } });
    await Promise.all([
      Rack.deleteMany({ warehouseId: id }),
      Bin.deleteMany({ warehouseId: id }),
      WarehouseInventory.deleteMany({ warehouseId: id }),
      StockMovement.updateMany({ warehouseId: id }, { warehouseId: null }),
      StockMovement.updateMany({ fromWarehouseId: id }, { fromWarehouseId: null }),
      StockMovement.updateMany({ toWarehouseId: id }, { toWarehouseId: null }),
    ]);
  },

  /* ------------------------- locations (rack+bin rows) ------------------------- */
  async addLocation(warehouseId, body) {
    const wh = await findOrThrow(warehouseId);
    const rack = cleanStr(body.rack);
    const bin = cleanStr(body.bin);
    if (!rack) throw new HttpError(400, 'Rack is required');
    if (!bin) throw new HttpError(400, 'Bin is required');
    wh.locations.push({
      rack,
      bin,
      productSku: cleanStr(body.productSku),
      quantity: body.quantity === undefined ? 0 : nonNegativeNumber(body.quantity, 'Quantity'),
    });
    await wh.save();
    return present(wh, await unitsByWarehouse());
  },

  async removeLocation(warehouseId, locationId) {
    const wh = await findOrThrow(warehouseId);
    if (!wh.locations.id(locationId)) throw new HttpError(404, 'Location not found');
    wh.locations.pull({ _id: locationId });
    await wh.save();
    return present(wh, await unitsByWarehouse());
  },

  /* ---------------------------------- racks ---------------------------------- */
  async listRacks(warehouseId) {
    await findOrThrow(warehouseId);
    return Rack.find({ warehouseId }).collation({ locale: 'en', numericOrdering: true }).sort({ name: 1 });
  },

  async addRack(warehouseId, body) {
    await findOrThrow(warehouseId);
    const name = cleanStr(body.name);
    if (!name) throw new HttpError(400, 'Rack name is required');
    if (await Rack.exists({ warehouseId, name: new RegExp(`^${escapeRegex(name)}$`, 'i') })) {
      throw new HttpError(409, `Rack "${name}" already exists in this warehouse`);
    }
    return Rack.create({ warehouseId, name });
  },

  /** Deleting a rack also deletes its bins and the inventory entries placed in it. */
  async removeRack(warehouseId, rackId) {
    const rack = await Rack.findOne({ _id: rackId, warehouseId });
    if (!rack) throw new HttpError(404, 'Rack not found');
    await rack.deleteOne();
    await Promise.all([Bin.deleteMany({ rackId }), WarehouseInventory.deleteMany({ rackId })]);
  },

  /* ---------------------------------- bins ---------------------------------- */
  async listBins(warehouseId, rackId) {
    await findOrThrow(warehouseId);
    const filter = { warehouseId };
    if (rackId) filter.rackId = requireId(rackId, 'rackId');
    return Bin.find(filter).collation({ locale: 'en', numericOrdering: true }).sort({ name: 1 });
  },

  async addBin(warehouseId, rackId, body) {
    await findOrThrow(warehouseId);
    if (!(await Rack.exists({ _id: rackId, warehouseId }))) throw new HttpError(404, 'Rack not found in this warehouse');
    const name = cleanStr(body.name);
    if (!name) throw new HttpError(400, 'Bin name is required');
    if (await Bin.exists({ rackId, name: new RegExp(`^${escapeRegex(name)}$`, 'i') })) {
      throw new HttpError(409, `Bin "${name}" already exists in this rack`);
    }
    return Bin.create({ warehouseId, rackId, name });
  },

  async removeBin(warehouseId, binId) {
    const bin = await Bin.findOne({ _id: binId, warehouseId });
    if (!bin) throw new HttpError(404, 'Bin not found');
    await bin.deleteOne();
    await WarehouseInventory.deleteMany({ binId });
  },

  /* --------------------------- warehouse inventory --------------------------- */
  async listInventory(warehouseId) {
    await findOrThrow(warehouseId);
    return WarehouseInventory.find({ warehouseId }).sort({ productName: 1 });
  },

  /** body: { productId, quantity, rackId, binId } — product name/sku and rack/bin names are filled in for you */
  async addInventory(warehouseId, body) {
    await findOrThrow(warehouseId);
    const productId = requireId(body.productId, 'Product');
    const rackId = requireId(body.rackId, 'Rack');
    const binId = requireId(body.binId, 'Bin');
    const quantity = positiveInt(body.quantity, 'Quantity');

    const [product, rack, bin] = await Promise.all([
      Product.findById(productId),
      Rack.findOne({ _id: rackId, warehouseId }),
      Bin.findOne({ _id: binId, warehouseId, rackId }),
    ]);
    if (!product) throw new HttpError(404, 'Product not found');
    if (!rack) throw new HttpError(404, 'Rack not found in this warehouse');
    if (!bin) throw new HttpError(404, 'Bin not found in that rack');

    return WarehouseInventory.create({
      warehouseId,
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      quantity,
      rackId: rack._id,
      rack: rack.name,
      binId: bin._id,
      bin: bin.name,
    });
  },

  async removeInventory(warehouseId, itemId) {
    const item = await WarehouseInventory.findOne({ _id: itemId, warehouseId });
    if (!item) throw new HttpError(404, 'Inventory entry not found');
    await item.deleteOne();
  },
};
