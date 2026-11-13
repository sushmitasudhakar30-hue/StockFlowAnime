/**
 * Larger demo dataset for reviews / presentations.
 *   49 products · 5 warehouses · 8 suppliers · ~64 sales orders · ~22 purchase orders · 150+ stock movements
 *
 * Everything is generated from fixed lists + a seeded random generator, so you get the SAME data every time
 * (no surprises during a demo). Dates are relative to "today", so the dashboard always has recent activity.
 *
 * To use your own real data: edit the lists in the "EDIT ME" sections below (products, suppliers,
 * customers, warehouses) and run  `npm run seed:fresh`.
 */
import mongoose from 'mongoose';
import { ymd } from './utils/validate.js';

/* ---------- tiny seeded random generator (same numbers every run) ---------- */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rnd = mulberry32(20240611); // re-created at the start of every build → identical data each time
const rint = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const chance = (p) => rnd() < p;
const DAY = 24 * 60 * 60 * 1000;
const oid = () => new mongoose.Types.ObjectId();
const dateAgo = (n) => ymd(new Date(Date.now() - n * DAY));
const dateTimeAgo = (n, hour, minute) => {
  const d = new Date(Date.now() - n * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
};

/* =============================== EDIT ME: warehouses =============================== */
const WAREHOUSES = [
  { key: 'blr', name: 'Bengaluru DC',    location: 'Peenya Industrial Area, Bengaluru, Karnataka', weight: 1.3 },
  { key: 'maa', name: 'Chennai DC',      location: 'Ambattur Estate, Chennai, Tamil Nadu',          weight: 1.1 },
  { key: 'hyd', name: 'Hyderabad DC',    location: 'Patancheru, Hyderabad, Telangana',              weight: 1.0 },
  { key: 'bom', name: 'Mumbai DC',       location: 'Bhiwandi Logistics Park, Thane, Maharashtra',   weight: 1.4 },
  { key: 'del', name: 'Delhi NCR DC',    location: 'Manesar Industrial Area, Gurugram, Haryana',    weight: 1.2 },
];

/* =============================== EDIT ME: suppliers =============================== */
// Real company names. Contact person / e-mail / phone are PLACEHOLDERS — replace with your real contacts.
const SUPPLIERS = [
  { key: 'tata',   name: 'Tata Consumer Products Ltd',          contactPerson: 'Sales Desk', email: 'sales@tataconsumer.example',  phone: '+91 22 0000 0001', address: 'Mumbai, Maharashtra' },
  { key: 'itc',    name: 'ITC Limited (Foods Division)',        contactPerson: 'Sales Desk', email: 'foods@itc.example',           phone: '+91 33 0000 0002', address: 'Kolkata, West Bengal' },
  { key: 'hul',    name: 'Hindustan Unilever Ltd',              contactPerson: 'Sales Desk', email: 'orders@hul.example',          phone: '+91 22 0000 0003', address: 'Mumbai, Maharashtra' },
  { key: 'redi',   name: 'Redington India Ltd',                 contactPerson: 'Sales Desk', email: 'sales@redington.example',     phone: '+91 44 0000 0004', address: 'Chennai, Tamil Nadu' },
  { key: 'nav',    name: 'Navneet Education Ltd',               contactPerson: 'Sales Desk', email: 'trade@navneet.example',       phone: '+91 22 0000 0005', address: 'Mumbai, Maharashtra' },
  { key: 'abfrl',  name: 'Aditya Birla Fashion and Retail Ltd', contactPerson: 'Sales Desk', email: 'wholesale@abfrl.example',     phone: '+91 80 0000 0006', address: 'Bengaluru, Karnataka' },
  { key: 'ttk',    name: 'TTK Prestige Ltd',                    contactPerson: 'Sales Desk', email: 'dealers@ttkprestige.example', phone: '+91 80 0000 0007', address: 'Bengaluru, Karnataka' },
  { key: 'deca',   name: 'Decathlon Sports India Pvt Ltd',      contactPerson: 'Sales Desk', email: 'b2b@decathlon.example',       phone: '+91 80 0000 0008', address: 'Bengaluru, Karnataka' },
];
// which supplier supplies which category (used for purchase orders)
const SUPPLIER_OF_CATEGORY = {
  'Food & Beverages': ['tata', 'itc'],
  'Electronics': ['redi'],
  'Office Supplies': ['nav'],
  'Apparel': ['abfrl'],
  'Home & Kitchen': ['ttk'],
  'Personal Care': ['hul'],
  'Sports & Fitness': ['deca'],
};

/* =============================== EDIT ME: products =============================== */
// [sku, name, category, price (INR, approximate), reorderLevel]
const PRODUCTS = [
  ['FNB-001', 'Organic Green Tea (100g)', 'Food & Beverages', 179, 40],
  ['FNB-002', 'Roasted Almonds (500g)', 'Food & Beverages', 349, 30],
  ['FNB-003', 'Dark Chocolate Bar', 'Food & Beverages', 199, 50],
  ['FNB-004', 'Tata Tea Gold (500g)', 'Food & Beverages', 285, 60],
  ['FNB-005', 'Aashirvaad Whole Wheat Atta (5kg)', 'Food & Beverages', 275, 80],
  ['FNB-006', 'Tata Sampann Toor Dal (1kg)', 'Food & Beverages', 185, 70],
  ['FNB-007', 'Tata Salt (1kg)', 'Food & Beverages', 28, 150],
  ['FNB-008', 'Sunfeast Dark Fantasy Choco Fills (300g)', 'Food & Beverages', 150, 60],

  ['ELEC-001', 'Wireless Earbuds', 'Electronics', 599, 30],
  ['ELEC-002', 'USB-C Charging Cable', 'Electronics', 249, 60],
  ['ELEC-003', 'Bluetooth Speaker', 'Electronics', 2499, 15],
  ['ELEC-004', 'Samsung 25W Fast Charger', 'Electronics', 1299, 25],
  ['ELEC-005', 'Power Bank 20000mAh', 'Electronics', 2199, 20],
  ['ELEC-006', 'Logitech Wireless Mouse', 'Electronics', 799, 30],
  ['ELEC-007', '32GB USB Pen Drive', 'Electronics', 449, 50],

  ['OFS-001', 'A5 Ruled Notebook', 'Office Supplies', 89, 100],
  ['OFS-002', 'Gel Pen Pack (10)', 'Office Supplies', 129, 80],
  ['OFS-003', 'Heavy-Duty Stapler', 'Office Supplies', 149, 20],
  ['OFS-004', 'Classmate Long Notebook (172 pages)', 'Office Supplies', 70, 120],
  ['OFS-005', 'A4 Copier Paper (500 sheets)', 'Office Supplies', 320, 60],
  ['OFS-006', 'Permanent Marker Pack (4)', 'Office Supplies', 160, 50],
  ['OFS-007', 'Sticky Notes 3x3 (12 pads)', 'Office Supplies', 210, 40],
  ['OFS-008', 'Office File Folder (Pack of 10)', 'Office Supplies', 240, 40],

  ['APP-001', 'Cotton T-Shirt', 'Apparel', 399, 50],
  ['APP-002', 'Denim Jacket', 'Apparel', 1299, 20],
  ['APP-003', 'Running Shoes', 'Apparel', 1899, 25],
  ['APP-004', "Men's Polo T-Shirt", 'Apparel', 699, 40],
  ['APP-005', "Women's Cotton Kurta", 'Apparel', 899, 35],
  ['APP-006', 'Slim Fit Jeans', 'Apparel', 1499, 30],
  ['APP-007', 'Cotton Socks (Pack of 3)', 'Apparel', 299, 60],
  ['APP-008', 'Hooded Sweatshirt', 'Apparel', 1199, 25],

  ['HK-001', 'Pressure Cooker 3L', 'Home & Kitchen', 1899, 20],
  ['HK-002', 'Non-stick Tawa 28cm', 'Home & Kitchen', 799, 25],
  ['HK-003', 'Stainless Steel Water Bottle 1L', 'Home & Kitchen', 549, 40],
  ['HK-004', 'LED Bulb 9W (Pack of 4)', 'Home & Kitchen', 399, 60],
  ['HK-005', 'Electric Kettle 1.5L', 'Home & Kitchen', 1199, 20],
  ['HK-006', 'Cotton Bedsheet (Double)', 'Home & Kitchen', 999, 25],

  ['PC-001', 'Dove Cream Beauty Bar (Pack of 3)', 'Personal Care', 210, 70],
  ['PC-002', 'Lifebuoy Handwash (750ml)', 'Personal Care', 155, 60],
  ['PC-003', 'Clinic Plus Shampoo (650ml)', 'Personal Care', 380, 50],
  ['PC-004', "Pond's Face Wash (100g)", 'Personal Care', 210, 50],
  ['PC-005', 'Surf Excel Matic Detergent (2kg)', 'Personal Care', 520, 40],
  ['PC-006', 'Toothpaste (200g)', 'Personal Care', 120, 90],

  ['SPT-001', 'Yoga Mat 6mm', 'Sports & Fitness', 699, 30],
  ['SPT-002', 'Cricket Bat (Kashmir Willow)', 'Sports & Fitness', 1499, 15],
  ['SPT-003', 'Football (Size 5)', 'Sports & Fitness', 899, 25],
  ['SPT-004', 'Skipping Rope', 'Sports & Fitness', 199, 50],
  ['SPT-005', 'Dumbbell Set 10kg', 'Sports & Fitness', 1799, 15],
  ['SPT-006', 'Badminton Racquet (Pair)', 'Sports & Fitness', 1299, 20],
];
// Products that should show up as LOW / OUT of stock in the demo (total stock is forced below reorder level)
const FORCE_LOW = ['FNB-003', 'APP-003', 'OFS-003', 'SPT-006', 'ELEC-005', 'PC-002'];
const FORCE_OUT = ['PC-004', 'HK-005'];

/* =============================== EDIT ME: customers =============================== */
const CUSTOMERS = [
  'TechBazaar', 'ShopMart', 'DailyNeeds', 'FashionBox', 'RetailMax', 'UrbanKart', 'GreenBasket Stores',
  'Sunrise Supermarket', 'MetroMart Retail', 'Lakshmi Traders', 'Kaveri Enterprises', 'Southern Cross Retail',
  'BrightHome Stores', 'Pragati Wholesale', 'CityStyle Boutique', 'QuickMart Express',
];

const USERS = {
  stock: ['Priya Nair', 'Rohan Mehta'],
  sales: ['Arjun Rao', 'Rohan Mehta'],
};

export function buildLargeDemoData() {
  rnd = mulberry32(20240611);
  /* ---- warehouses ---- */
  const wh = WAREHOUSES.map((w) => ({ ...w, _id: oid() }));

  /* ---- products + stock per warehouse ---- */
  const products = PRODUCTS.map(([sku, name, category, price, reorderLevel]) => {
    let target = Math.round(reorderLevel * (1.3 + rnd() * 3));
    if (FORCE_LOW.includes(sku)) target = Math.max(1, Math.round(reorderLevel * (0.35 + rnd() * 0.5)));
    if (FORCE_OUT.includes(sku)) target = 0;
    const weights = wh.map((w) => (chance(0.12) ? 0 : w.weight * (0.5 + rnd())));
    const sum = weights.reduce((a, b) => a + b, 0) || 1;
    const stock = weights.map((x) => Math.floor((x / sum) * target));
    if (target > 0 && stock.every((q) => q === 0)) stock[0] = target;
    return {
      _id: oid(), sku, name, category, price, reorderLevel,
      warehouseStock: Object.fromEntries(wh.map((w, i) => [String(w._id), stock[i]])),
      _stock: stock,
    };
  });
  const byId = (id) => products.find((p) => String(p._id) === String(id));
  const total = (p) => p._stock.reduce((a, b) => a + b, 0);

  /* ---- racks, bins and warehouse inventory (one entry per product per warehouse that holds it) ---- */
  const categories = [...new Set(PRODUCTS.map((p) => p[2]))];
  const letter = (cat) => String.fromCharCode(65 + categories.indexOf(cat));
  const racks = [], bins = [], inventory = [];
  wh.forEach((w, wi) => {
    const seenPerCategory = {};
    products.forEach((p) => {
      const qty = p._stock[wi];
      if (qty <= 0) return;
      const n = (seenPerCategory[p.category] = (seenPerCategory[p.category] || 0) + 1);
      const rackName = `${letter(p.category)}${Math.ceil(n / 3)}`;
      const binName = `B${String(((n - 1) % 3) + 1).padStart(2, '0')}`;
      let rack = racks.find((r) => String(r.warehouseId) === String(w._id) && r.name === rackName);
      if (!rack) { rack = { _id: oid(), warehouseId: w._id, name: rackName }; racks.push(rack); }
      let bin = bins.find((b) => String(b.rackId) === String(rack._id) && b.name === binName);
      if (!bin) { bin = { _id: oid(), warehouseId: w._id, rackId: rack._id, name: binName }; bins.push(bin); }
      inventory.push({
        warehouseId: w._id, productId: p._id, productName: p.name, sku: p.sku, quantity: qty,
        rackId: rack._id, rack: rack.name, binId: bin._id, bin: bin.name,
      });
    });
  });

  /* ---- warehouse documents (capacity so that utilisation looks realistic: ~45–65 %) ---- */
  const warehouses = wh.map((w, wi) => {
    const used = products.reduce((s, p) => s + p._stock[wi], 0);
    const capacity = Math.max(1000, Math.ceil(used / (0.45 + rnd() * 0.2) / 500) * 500);
    const locations = inventory
      .filter((i) => String(i.warehouseId) === String(w._id))
      .slice(0, 6)
      .map((i) => ({ rack: i.rack, bin: i.bin, productSku: i.sku, quantity: i.quantity }));
    return { _id: w._id, name: w.name, location: w.location, capacity, locations };
  });

  /* ---- suppliers ---- */
  const supplierIds = Object.fromEntries(SUPPLIERS.map((s) => [s.key, oid()]));
  const supplierDocs = SUPPLIERS.map(({ key, ...s }) => ({ _id: supplierIds[key], ...s })); // "key" is only a lookup name, not stored

  /* ---- sales orders: oldest first so numbers go up with time ---- */
  const salesDays = [];
  for (let i = 0; i < 64; i++) salesDays.push(Math.round(178 * Math.pow(1 - i / 64, 2)));
  salesDays.sort((a, b) => b - a);
  const salesOrders = salesDays.map((age, i) => {
    const nLines = rint(1, 4);
    const chosen = new Set();
    while (chosen.size < nLines) chosen.add(pick(products));
    const items = [...chosen].map((p) => ({
      productId: p._id,
      qty: Math.max(1, Math.round(p.reorderLevel * (0.3 + rnd() * 1.2))),
      price: p.price,
    }));
    let status;
    if (age > 20) status = chance(0.88) ? 'Delivered' : chance(0.5) ? 'Cancelled' : 'Returned';
    else if (age > 8) status = chance(0.6) ? 'Delivered' : 'Shipped';
    else if (age > 3) status = pick(['Shipped', 'Confirmed', 'Confirmed', 'Delivered']);
    else status = pick(['Pending', 'Pending', 'Confirmed']);
    if (i >= 61) status = 'Pending'; // the three newest are always waiting for confirmation
    const warehouseId = status === 'Pending' || status === 'Cancelled' ? null : pick(wh)._id;
    return {
      orderNumber: `SO-${1001 + i}`, customer: pick(CUSTOMERS), date: dateAgo(age), status, items,
      total: items.reduce((s, it) => s + it.qty * it.price, 0), warehouseId, _age: age,
    };
  });

  /* ---- purchase orders ---- */
  const poDays = [];
  for (let i = 0; i < 22; i++) poDays.push(Math.round(165 * Math.pow(1 - i / 22, 1.2)));
  poDays.sort((a, b) => b - a);
  const purchaseOrders = poDays.map((age, i) => {
    const category = pick(categories);
    const supplierId = supplierIds[pick(SUPPLIER_OF_CATEGORY[category])];
    const pool = products.filter((p) => p.category === category);
    const chosen = new Set();
    const nLines = Math.min(pool.length, rint(1, 3));
    while (chosen.size < nLines) chosen.add(pick(pool));
    const items = [...chosen].map((p) => ({
      productId: p._id,
      qty: Math.max(10, Math.round(p.reorderLevel * (1 + rnd() * 2))),
      price: Math.round(p.price * 0.7), // buying price ≈ 70 % of selling price
    }));
    let status = age > 10 ? (chance(0.92) ? 'Received' : 'Cancelled') : 'Pending';
    if (i >= 20) status = 'Pending';
    const receivedAge = Math.max(0, age - rint(2, 6));
    const warehouseId = status === 'Received' ? pick(wh)._id : null;
    return {
      poNumber: `PO-${2001 + i}`, supplierId, date: dateAgo(age), status, items,
      total: items.reduce((s, it) => s + it.qty * it.price, 0), warehouseId,
      receivedAt: status === 'Received' ? dateTimeAgo(receivedAge, 10, 0) : null,
      _receivedAge: receivedAge,
    };
  });

  /* ---- stock movements (generated from the orders above + some manual ones) ---- */
  const movements = [];
  const mv = (ago, hour, type, productId, whs, qty, user, note) =>
    movements.push({
      type, productId, qty, user, note, date: dateTimeAgo(ago, hour, rint(0, 59)),
      warehouseId: type === 'Transfer' ? null : whs,
      fromWarehouseId: type === 'Transfer' ? whs[0] : null,
      toWarehouseId: type === 'Transfer' ? whs[1] : null,
    });
  salesOrders.forEach((o) => {
    if (['Confirmed', 'Shipped', 'Delivered', 'Returned'].includes(o.status)) {
      const user = pick(USERS.sales);
      o.items.forEach((it) => mv(Math.max(0, o._age - (o.status === 'Confirmed' ? 0 : 1)), rint(9, 17), 'Stock Out', it.productId, o.warehouseId, it.qty, user, `Order confirmed: ${o.orderNumber}`));
    }
    if (o.status === 'Returned') {
      o.items.forEach((it) => mv(Math.max(0, o._age - 6), rint(9, 17), 'Stock In', it.productId, o.warehouseId, it.qty, pick(USERS.stock), `Order returned: ${o.orderNumber}`));
    }
  });
  purchaseOrders.forEach((po) => {
    if (po.status !== 'Received') return;
    const user = pick(USERS.stock);
    po.items.forEach((it) => mv(po._receivedAge, rint(9, 17), 'Stock In', it.productId, po.warehouseId, it.qty, user, `PO received: ${po.poNumber}`));
  });
  for (let i = 0; i < 14; i++) { // transfers between warehouses
    const [a, b] = [pick(wh), pick(wh)];
    if (a === b) continue;
    const p = pick(products);
    mv(rint(1, 150), rint(9, 17), 'Transfer', p._id, [a._id, b._id], rint(5, Math.max(6, Math.round(p.reorderLevel * 0.6))), pick(USERS.stock), 'Rebalancing stock between warehouses');
  }
  const damageNotes = ['Packaging damaged in transit', 'Water damage in storage', 'Damaged by humidity', 'Broken during handling', 'Expired / past best-before date'];
  for (let i = 0; i < 12; i++) {
    const p = pick(products);
    mv(rint(1, 150), rint(9, 17), 'Damaged', p._id, pick(wh)._id, rint(1, Math.max(2, Math.round(p.reorderLevel * 0.15))), pick(USERS.stock), pick(damageNotes));
  }
  for (let i = 0; i < 14; i++) {
    const p = pick(products);
    mv(rint(1, 150), rint(9, 17), 'Stock In', p._id, pick(wh)._id, rint(10, Math.max(12, p.reorderLevel)), pick(USERS.stock), 'Supplier delivery');
  }
  movements.sort((a, b) => b.date - a.date);

  /* ---- notifications ---- */
  const lowProducts = products.filter((p) => total(p) <= p.reorderLevel).slice(0, 6);
  const notificationDefs = [
    ...salesOrders.filter((o) => o.status === 'Pending').slice(-3).map((o) => ({
      type: 'order_status', title: 'New order received', message: `${o.orderNumber} from ${o.customer} is awaiting confirmation`, date: o.date, read: false,
    })),
    ...lowProducts.map((p) => ({
      type: 'low_stock', title: `${total(p) === 0 ? 'Out of Stock' : 'Low Stock'}: ${p.name}`,
      message: `Total stock is ${total(p)} (reorder at ${p.reorderLevel})`, date: dateAgo(rint(0, 3)), read: chance(0.2),
    })),
    ...movements.filter((m) => m.type === 'Transfer').slice(0, 2).map((m) => ({
      type: 'transfer', title: 'Transfer completed',
      message: `${m.qty} × ${byId(m.productId).name} moved ${wh.find((w) => String(w._id) === String(m.fromWarehouseId)).name} → ${wh.find((w) => String(w._id) === String(m.toWarehouseId)).name}`,
      date: ymd(m.date), read: true,
    })),
  ];
  const notifications = notificationDefs.map((n, i) => ({ ...n, createdAt: new Date(Date.now() - i * 1000) }));

  /* ---- strip helper fields before saving ---- */
  const cleanProducts = products.map(({ _stock, ...p }) => p);
  salesOrders.forEach((o) => delete o._age);
  purchaseOrders.forEach((o) => delete o._receivedAge);

  return {
    warehouses, products: cleanProducts, racks, bins, inventory, suppliers: supplierDocs,
    salesOrders, purchaseOrders, movements, notifications,
    counters: { salesOrder: 1000 + salesOrders.length, purchaseOrder: 2000 + purchaseOrders.length },
  };
}
