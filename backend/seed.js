/**
 * Creates demo data the first time (only when the collections are empty). Runs automatically when the
 * server starts. You can also run:
 *    npm run seed          → add whatever is missing
 *    npm run seed:fresh    → DELETE all products/warehouses/orders/… and add the demo data again (users are kept)
 *
 * The demo data is the same data the React app used to keep in localStorage (src/services/seedData.js),
 * now saved in MongoDB. Dates are relative to "today" so the dashboard always has recent data.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';
import Product from './models/Product.js';
import Warehouse from './models/Warehouse.js';
import Rack from './models/Rack.js';
import Bin from './models/Bin.js';
import WarehouseInventory from './models/WarehouseInventory.js';
import StockMovement from './models/StockMovement.js';
import Supplier from './models/Supplier.js';
import SalesOrder from './models/SalesOrder.js';
import PurchaseOrder from './models/PurchaseOrder.js';
import Notification from './models/Notification.js';
import Counter from './models/Counter.js';
import { ymd } from './utils/validate.js';
import { buildLargeDemoData } from './seedLargeData.js';

/* ------------------------------- Users ------------------------------- */
const DEMO_USERS = [
  { name: 'Akshatha Shetty', email: 'admin@stockflow.in',   password: 'admin123',   role: 'Admin',             active: true,  avatar: 'AS' },
  { name: 'Rohan Mehta',     email: 'manager@stockflow.in', password: 'manager123', role: 'Warehouse Manager', active: true,  avatar: 'RM' },
  { name: 'Priya Nair',      email: 'staff@stockflow.in',   password: 'staff123',   role: 'Inventory Staff',   active: true,  avatar: 'PN' },
  { name: 'Arjun Rao',       email: 'sales@stockflow.in',   password: 'sales123',   role: 'Sales Staff',       active: true,  avatar: 'AR' },
  { name: 'Kavya Iyer',      email: 'kavya@stockflow.in',   password: 'kavya123',   role: 'Inventory Staff',   active: false, avatar: 'KI' },
];

export async function seedUsersIfEmpty() {
  if ((await User.countDocuments()) > 0) return;
  const docs = await Promise.all(
    DEMO_USERS.map(async (u) => ({ ...u, password: await bcrypt.hash(u.password, 10) }))
  );
  await User.insertMany(docs);
  console.log(`🌱 Added ${docs.length} demo users to MongoDB`);
}

/* --------------------------- Business data ---------------------------- */
const DAY = 24 * 60 * 60 * 1000;
const oid = () => new mongoose.Types.ObjectId();
const daysAgoDate = (n) => ymd(new Date(Date.now() - n * DAY));
const monthsBackDate = (back, day) => {
  const now = new Date();
  return ymd(new Date(now.getFullYear(), now.getMonth() - back, day));
};
const daysAgoDateTime = (n, hour = 10, minute = 0) => {
  const d = new Date(Date.now() - n * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
};

function buildSmallDemoData() {
  /* Warehouses (ids created up front so everything can point at them) */
  const WH = { blr: oid(), maa: oid(), hyd: oid() };
  const whList = [WH.blr, WH.maa, WH.hyd];

  /* Products — stock: [Bengaluru, Chennai, Hyderabad] */
  const productDefs = [
    { sku: 'FNB-001',  name: 'Organic Green Tea (100g)',  category: 'Food & Beverages', price: 179,  reorderLevel: 40,  stock: [120, 90, 60] },
    { sku: 'FNB-002',  name: 'Roasted Almonds (500g)',    category: 'Food & Beverages', price: 349,  reorderLevel: 30,  stock: [80, 60, 45] },
    { sku: 'FNB-003',  name: 'Dark Chocolate Bar',        category: 'Food & Beverages', price: 199,  reorderLevel: 50,  stock: [20, 12, 8] },
    { sku: 'ELEC-001', name: 'Wireless Earbuds',          category: 'Electronics',      price: 599,  reorderLevel: 30,  stock: [70, 50, 40] },
    { sku: 'ELEC-002', name: 'USB-C Charging Cable',      category: 'Electronics',      price: 249,  reorderLevel: 60,  stock: [150, 120, 90] },
    { sku: 'ELEC-003', name: 'Bluetooth Speaker',         category: 'Electronics',      price: 2499, reorderLevel: 15,  stock: [35, 25, 20] },
    { sku: 'OFS-001',  name: 'A5 Ruled Notebook',         category: 'Office Supplies',  price: 89,   reorderLevel: 100, stock: [300, 250, 200] },
    { sku: 'OFS-002',  name: 'Gel Pen Pack (10)',         category: 'Office Supplies',  price: 129,  reorderLevel: 80,  stock: [180, 140, 110] },
    { sku: 'OFS-003',  name: 'Heavy-Duty Stapler',        category: 'Office Supplies',  price: 149,  reorderLevel: 20,  stock: [0, 10, 6] },
    { sku: 'APP-001',  name: 'Cotton T-Shirt',            category: 'Apparel',          price: 399,  reorderLevel: 50,  stock: [110, 90, 70] },
    { sku: 'APP-002',  name: 'Denim Jacket',              category: 'Apparel',          price: 1299, reorderLevel: 20,  stock: [40, 30, 25] },
    { sku: 'APP-003',  name: 'Running Shoes',             category: 'Apparel',          price: 1899, reorderLevel: 25,  stock: [8, 10, 2] },
  ];
  const defOf = (sku) => productDefs.find((d) => d.sku === sku);
  const products = productDefs.map((d) => ({
    _id: oid(),
    sku: d.sku,
    name: d.name,
    category: d.category,
    price: d.price,
    reorderLevel: d.reorderLevel,
    warehouseStock: Object.fromEntries(whList.map((w, i) => [String(w), d.stock[i]])),
  }));
  const pid = (sku) => products.find((p) => p.sku === sku)._id;

  /* Warehouses with rack/bin "locations" (quantities mirror real stock) */
  const loc = (whIdx, rack, bin, sku) => ({ rack, bin, productSku: sku, quantity: defOf(sku).stock[whIdx] });
  const warehouses = [
    { _id: WH.blr, name: 'Bengaluru DC', location: 'Peenya Industrial Area, Bengaluru, Karnataka', capacity: 2500,
      locations: [loc(0, 'A1', 'B01', 'ELEC-001'), loc(0, 'A1', 'B02', 'ELEC-002'), loc(0, 'B2', 'B04', 'FNB-001'), loc(0, 'C1', 'B07', 'OFS-001'), loc(0, 'D3', 'B02', 'APP-001')] },
    { _id: WH.maa, name: 'Chennai DC', location: 'Ambattur Estate, Chennai, Tamil Nadu', capacity: 2000,
      locations: [loc(1, 'A2', 'B03', 'ELEC-003'), loc(1, 'B1', 'B05', 'FNB-002'), loc(1, 'C2', 'B01', 'OFS-002'), loc(1, 'D1', 'B06', 'APP-002')] },
    { _id: WH.hyd, name: 'Hyderabad DC', location: 'Patancheru, Hyderabad, Telangana', capacity: 1800,
      locations: [loc(2, 'A1', 'B01', 'APP-003'), loc(2, 'B3', 'B02', 'OFS-003'), loc(2, 'C1', 'B04', 'FNB-003'), loc(2, 'D2', 'B08', 'ELEC-001')] },
  ];

  /* Racks, bins and warehouse-inventory entries — derived from the locations above */
  const racks = [], bins = [], inventory = [];
  warehouses.forEach((w) => {
    w.locations.forEach((l) => {
      let rack = racks.find((r) => String(r.warehouseId) === String(w._id) && r.name === l.rack);
      if (!rack) { rack = { _id: oid(), warehouseId: w._id, name: l.rack }; racks.push(rack); }
      let bin = bins.find((b) => String(b.rackId) === String(rack._id) && b.name === l.bin);
      if (!bin) { bin = { _id: oid(), warehouseId: w._id, rackId: rack._id, name: l.bin }; bins.push(bin); }
      const product = products.find((p) => p.sku === l.productSku);
      inventory.push({
        warehouseId: w._id, productId: product._id, productName: product.name, sku: product.sku,
        quantity: l.quantity, rackId: rack._id, rack: rack.name, binId: bin._id, bin: bin.name,
      });
    });
  });
  const inventoryFinal = inventory.filter((i) => i.quantity > 0); // quantity must be positive

  /* Suppliers */
  const S = { fresh: oid(), tech: oid(), paper: oid(), urban: oid() };
  const suppliers = [
    { _id: S.fresh, name: 'FreshFoods India Pvt Ltd', contactPerson: 'Meera Kulkarni', email: 'orders@freshfoods.example', phone: '+91 98450 11122', address: 'Whitefield, Bengaluru, Karnataka' },
    { _id: S.tech,  name: 'TechSource Distributors',  contactPerson: 'Vikram Reddy',   email: 'sales@techsource.example',  phone: '+91 98400 22233', address: 'T. Nagar, Chennai, Tamil Nadu' },
    { _id: S.paper, name: 'PaperPlus Stationers',     contactPerson: 'Sunita Joshi',   email: 'hello@paperplus.example',   phone: '+91 99890 33344', address: 'Begum Bazaar, Hyderabad, Telangana' },
    { _id: S.urban, name: 'UrbanWear Garments',       contactPerson: 'Imran Sheikh',   email: 'supply@urbanwear.example',  phone: '+91 98860 44455', address: 'Tiruppur, Tamil Nadu' },
  ];

  /* Orders */
  const lines = (list) => list.map(([sku, qty]) => ({ productId: pid(sku), qty, price: defOf(sku).price }));
  const totalOf = (items) => items.reduce((s, i) => s + i.qty * i.price, 0);
  const makeSO = (orderNumber, customer, date, status, list) => {
    const items = lines(list);
    return { orderNumber, customer, date, status, items, total: totalOf(items), warehouseId: status === 'Pending' ? null : WH.blr };
  };
  const makePO = (poNumber, supplierId, date, status, list) => {
    const items = lines(list);
    return {
      poNumber, supplierId, date, status, items, total: totalOf(items),
      warehouseId: status === 'Received' ? WH.blr : null,
      receivedAt: status === 'Received' ? new Date(`${date}T10:00:00`) : null,
    };
  };

  const salesOrders = [
    makeSO('SO-1001', 'TechBazaar', daysAgoDate(0),  'Pending',   [['ELEC-003', 5], ['ELEC-002', 20]]),
    makeSO('SO-1002', 'ShopMart',   daysAgoDate(1),  'Pending',   [['ELEC-001', 10], ['OFS-001', 50]]),
    makeSO('SO-1003', 'DailyNeeds', daysAgoDate(2),  'Confirmed', [['FNB-001', 30], ['FNB-002', 20]]),
    makeSO('SO-1004', 'FashionBox', daysAgoDate(4),  'Shipped',   [['APP-001', 25], ['APP-002', 8]]),
    makeSO('SO-1005', 'RetailMax',  daysAgoDate(9),  'Delivered', [['FNB-002', 40], ['OFS-002', 60]]),
    makeSO('SO-1006', 'UrbanKart',  daysAgoDate(16), 'Delivered', [['ELEC-001', 15], ['APP-001', 30]]),
    // older delivered orders → feed the 6-month sales chart
    makeSO('SO-0901', 'RetailMax',  monthsBackDate(5, 12), 'Delivered', [['FNB-002', 50], ['FNB-003', 60]]),
    makeSO('SO-0902', 'ShopMart',   monthsBackDate(4, 14), 'Delivered', [['ELEC-001', 40], ['OFS-001', 100]]),
    makeSO('SO-0903', 'DailyNeeds', monthsBackDate(3, 12), 'Delivered', [['APP-001', 60], ['APP-002', 15]]),
    makeSO('SO-0904', 'TechBazaar', monthsBackDate(2, 18), 'Delivered', [['ELEC-003', 12], ['ELEC-002', 40]]),
    makeSO('SO-0905', 'FashionBox', monthsBackDate(1, 8),  'Delivered', [['APP-003', 10], ['FNB-001', 80]]),
  ];

  const purchaseOrders = [
    makePO('PO-2001', S.fresh, daysAgoDate(1),  'Pending',  [['FNB-003', 120], ['FNB-001', 60]]),
    makePO('PO-2002', S.urban, daysAgoDate(3),  'Pending',  [['APP-003', 40]]),
    makePO('PO-2003', S.paper, daysAgoDate(7),  'Pending',  [['OFS-003', 50], ['OFS-002', 100]]),
    makePO('PO-2004', S.tech,  daysAgoDate(12), 'Received', [['ELEC-002', 150], ['ELEC-001', 60]]),
    makePO('PO-2005', S.fresh, daysAgoDate(20), 'Received', [['FNB-002', 80]]),
  ];

  /* Stock movements: [daysAgo, hour, type, sku, warehouse B/C/H or [from,to], qty, user, note] */
  const w = { B: WH.blr, C: WH.maa, H: WH.hyd };
  const movementDefs = [
    [1, 16, 'Stock In',  'ELEC-002', 'B', 150, 'Priya Nair',  'PO received: PO-2004'],
    [1, 11, 'Stock Out', 'FNB-001',  'B', 30,  'Rohan Mehta', 'Order confirmed: SO-1003'],
    [2, 15, 'Stock In',  'ELEC-001', 'B', 60,  'Priya Nair',  'PO received: PO-2004'],
    [2, 10, 'Transfer',  'APP-001',  ['B', 'H'], 20, 'Rohan Mehta', 'Rebalancing stock'],
    [3, 14, 'Stock Out', 'APP-001',  'B', 25,  'Rohan Mehta', 'Order shipped: SO-1004'],
    [3, 9,  'Damaged',   'FNB-003',  'C', 6,   'Priya Nair',  'Packaging damaged in transit'],
    [4, 17, 'Stock Out', 'APP-002',  'B', 8,   'Rohan Mehta', 'Order shipped: SO-1004'],
    [5, 12, 'Stock In',  'OFS-002',  'C', 100, 'Priya Nair',  'Supplier delivery'],
    [6, 10, 'Stock Out', 'FNB-003',  'B', 25,  'Arjun Rao',   'Bulk order'],
    [7, 15, 'Transfer',  'ELEC-003', ['B', 'C'], 10, 'Rohan Mehta', 'Regional demand'],
    [8, 11, 'Stock In',  'FNB-002',  'B', 80,  'Priya Nair',  'PO received: PO-2005'],
    [9, 14, 'Stock Out', 'FNB-002',  'B', 40,  'Arjun Rao',   'Order delivered: SO-1005'],
    [9, 13, 'Stock Out', 'OFS-002',  'B', 60,  'Arjun Rao',   'Order delivered: SO-1005'],
    [10, 9, 'Damaged',   'APP-003',  'H', 3,   'Priya Nair',  'Water damage in storage'],
    [11, 16, 'Stock In', 'APP-003',  'B', 30,  'Priya Nair',  'Supplier delivery'],
    [12, 12, 'Stock Out', 'OFS-003', 'B', 14,  'Arjun Rao',   'Office client order'],
    [14, 10, 'Stock In', 'ELEC-003', 'C', 25,  'Priya Nair',  'Supplier delivery'],
    [16, 15, 'Stock Out', 'ELEC-001', 'B', 15, 'Arjun Rao',   'Order delivered: SO-1006'],
    [16, 14, 'Stock Out', 'APP-001', 'B', 30,  'Arjun Rao',   'Order delivered: SO-1006'],
    [18, 11, 'Transfer', 'FNB-001',  ['B', 'C'], 30, 'Rohan Mehta', 'Rebalancing stock'],
    [20, 10, 'Stock In', 'FNB-001',  'B', 100, 'Priya Nair',  'Supplier delivery'],
    [23, 16, 'Damaged',  'OFS-001',  'H', 12,  'Priya Nair',  'Damaged by humidity'],
    [25, 12, 'Stock In', 'OFS-001',  'B', 200, 'Priya Nair',  'Supplier delivery'],
    [27, 9,  'Stock Out', 'ELEC-002', 'C', 35, 'Arjun Rao',   'Retail order'],
    [29, 14, 'Stock In', 'APP-002',  'C', 30,  'Priya Nair',  'Supplier delivery'],
  ];
  const movements = movementDefs.map(([ago, hour, type, sku, wh, qty, user, note], i) => ({
    type, productId: pid(sku), qty, user, note,
    date: daysAgoDateTime(ago, hour, (i * 7) % 60),
    warehouseId: Array.isArray(wh) ? null : w[wh],
    fromWarehouseId: Array.isArray(wh) ? w[wh[0]] : null,
    toWarehouseId: Array.isArray(wh) ? w[wh[1]] : null,
  }));

  /* Notifications (createdAt spread out so the newest-first order is stable) */
  const notificationDefs = [
    { type: 'low_stock',    title: 'Low Stock: Running Shoes',      message: 'Total stock is 20 (reorder at 25)',                       date: daysAgoDate(1), read: false },
    { type: 'low_stock',    title: 'Low Stock: Dark Chocolate Bar', message: 'Total stock is 40 (reorder at 50)',                       date: daysAgoDate(1), read: false },
    { type: 'low_stock',    title: 'Low Stock: Heavy-Duty Stapler', message: 'Total stock is 16 (reorder at 20)',                       date: daysAgoDate(2), read: false },
    { type: 'order_status', title: 'New order received',            message: 'SO-1001 from TechBazaar is awaiting confirmation',        date: daysAgoDate(0), read: false },
    { type: 'transfer',     title: 'Transfer completed',            message: '20 × Cotton T-Shirt moved Bengaluru DC → Hyderabad DC',   date: daysAgoDate(2), read: true },
  ];
  const notifications = notificationDefs.map((n, i) => ({ ...n, createdAt: new Date(Date.now() - i * 1000) }));

  return { warehouses, products, racks, bins, inventory: inventoryFinal, suppliers, salesOrders, purchaseOrders, movements, notifications };
}

/** Adds the demo business data — only when there are no products and no warehouses yet. */
export async function seedDemoDataIfEmpty() {
  if ((await Product.countDocuments()) > 0 || (await Warehouse.countDocuments()) > 0) return;
  // Default = the larger review dataset (seedLargeData.js). Set SEED_DATASET=small in .env for the original 12-product demo.
  const d = process.env.SEED_DATASET === 'small' ? buildSmallDemoData() : buildLargeDemoData();

  await Warehouse.insertMany(d.warehouses);
  await Product.insertMany(d.products);
  await Rack.insertMany(d.racks);
  await Bin.insertMany(d.bins);
  await WarehouseInventory.insertMany(d.inventory);
  await Supplier.insertMany(d.suppliers);
  await SalesOrder.insertMany(d.salesOrders);
  await PurchaseOrder.insertMany(d.purchaseOrders);
  await StockMovement.insertMany(d.movements);
  await Notification.insertMany(d.notifications);

  // the next new orders continue after the last seeded SO / PO number
  await Counter.deleteMany({});
  await Counter.insertMany([
    { _id: 'salesOrder', seq: d.counters?.salesOrder ?? 1006 },
    { _id: 'purchaseOrder', seq: d.counters?.purchaseOrder ?? 2005 },
  ]);

  console.log(
    `🌱 Added demo data to MongoDB: ${d.products.length} products, ${d.warehouses.length} warehouses, ` +
    `${d.racks.length} racks, ${d.bins.length} bins, ${d.suppliers.length} suppliers, ${d.salesOrders.length} sales orders, ` +
    `${d.purchaseOrders.length} purchase orders, ${d.movements.length} stock movements, ${d.notifications.length} notifications`
  );
}

/** Removes everything except users. Used by:  npm run seed:fresh */
export async function wipeBusinessData() {
  await Promise.all(
    [Product, Warehouse, Rack, Bin, WarehouseInventory, StockMovement, Supplier, SalesOrder, PurchaseOrder, Notification, Counter]
      .map((m) => m.deleteMany({}))
  );
}

// Allow:  node seed.js   or   node seed.js --fresh
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  const fresh = process.argv.includes('--fresh');
  connectDB()
    .then(async () => {
      if (fresh) {
        console.log('⚠️  --fresh: deleting products, warehouses, orders, movements, suppliers, notifications …');
        await wipeBusinessData();
      }
      await seedUsersIfEmpty();
      await seedDemoDataIfEmpty();
    })
    .then(() => console.log('Seed finished'))
    .catch((e) => console.error(e.message))
    .finally(() => mongoose.disconnect());
}
