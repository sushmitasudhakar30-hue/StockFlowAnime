/**
 * Reports + dashboard numbers. Same calculations the React report pages do in the browser,
 * done on the server so they can be filtered with query parameters and tested in Postman.
 * (Plain JavaScript over the collections — easy to read, plenty fast for this data size.)
 */
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import Supplier from '../models/Supplier.js';
import StockMovement from '../models/StockMovement.js';
import SalesOrder from '../models/SalesOrder.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import { dayOf, inRange, ymd } from '../utils/validate.js';

const NON_REVENUE = ['Cancelled', 'Returned'];
const sum = (list, fn) => list.reduce((s, x) => s + (Number(fn(x)) || 0), 0);
const unitsOf = (order) => sum(order.items || [], (i) => i.qty);
const totalOf = (p) => sum(Object.values(p.warehouseStock || {}), (q) => q);
const label = (qty, reorder) => (qty === 0 ? 'Out of stock' : qty <= reorder ? 'Low stock' : 'In stock');
const norm = (s) => String(s).toLowerCase().replace(/[\s_]+/g, '-');
const round1 = (n) => Math.round(n * 10) / 10;

export const reportService = {
  /** Filters: warehouseId, category, status (in-stock|low-stock|out-of-stock), from, to */
  async stock({ warehouseId, category, status, from, to } = {}) {
    const [products, movements] = await Promise.all([
      Product.find().lean(),
      StockMovement.find().sort({ date: -1 }).lean(),
    ]);
    const nameOf = new Map(products.map((p) => [String(p._id), p.name]));

    let rows = products
      .filter((p) => !category || p.category === category)
      .map((p) => {
        const qty = warehouseId ? Number(p.warehouseStock?.[warehouseId]) || 0 : totalOf(p);
        const reorder = p.reorderLevel ?? 0;
        return { id: String(p._id), sku: p.sku, name: p.name, category: p.category, qty, reorder, status: label(qty, reorder), value: qty * (Number(p.price) || 0) };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    if (status) rows = rows.filter((r) => norm(r.status) === norm(status));

    const moves = movements
      .filter((m) => inRange(m.date, from, to))
      .filter((m) => !warehouseId || [m.warehouseId, m.fromWarehouseId, m.toWarehouseId].some((w) => w && String(w) === warehouseId))
      .map((m) => ({
        id: String(m._id), type: m.type, productId: m.productId ? String(m.productId) : null,
        productName: m.productId ? nameOf.get(String(m.productId)) || '—' : '—',
        qty: m.qty, date: m.date, user: m.user, note: m.note,
      }));
    const moved = (type) => sum(moves.filter((m) => m.type === type), (m) => m.qty);

    return {
      summary: {
        products: rows.length,
        totalUnits: sum(rows, (r) => r.qty),
        totalValue: sum(rows, (r) => r.value),
        needAttention: rows.filter((r) => r.status !== 'In stock').length,
        stockIn: moved('Stock In'), stockOut: moved('Stock Out'), transfers: moved('Transfer'), damaged: moved('Damaged'),
      },
      rows,
      movements: moves,
    };
  },

  /** Filters: from, to, status. Cancelled/Returned orders are listed but not counted as revenue. */
  async sales({ from, to, status } = {}) {
    const [orders, products] = await Promise.all([SalesOrder.find().sort({ date: -1 }).lean(), Product.find({}, 'name price').lean()]);
    const nameOf = new Map(products.map((p) => [String(p._id), p.name]));

    const rows = orders.filter((o) => inRange(o.date, from, to) && (!status || o.status === status));
    const counted = rows.filter((o) => !NON_REVENUE.includes(o.status));

    const top = {};
    counted.forEach((o) => (o.items || []).forEach((i) => {
      const t = (top[String(i.productId)] ||= { productId: String(i.productId), name: nameOf.get(String(i.productId)) || '—', units: 0, revenue: 0 });
      t.units += Number(i.qty) || 0;
      t.revenue += (Number(i.qty) || 0) * (Number(i.price) || 0);
    }));

    const byStatus = {};
    rows.forEach((o) => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });

    const revenue = sum(counted, (o) => o.total);
    return {
      summary: {
        orders: rows.length,
        revenue,
        unitsSold: sum(counted, unitsOf),
        averageOrderValue: counted.length ? Math.round(revenue / counted.length) : 0,
        byStatus,
      },
      topProducts: Object.values(top).sort((a, b) => b.units - a.units).slice(0, 10),
      rows: rows.map((o) => ({ id: String(o._id), orderNumber: o.orderNumber, date: o.date, customer: o.customer, units: unitsOf(o), total: o.total, status: o.status })),
    };
  },

  /** Filters: from, to, supplierId, status */
  async purchase({ from, to, supplierId, status } = {}) {
    const [orders, suppliers] = await Promise.all([PurchaseOrder.find().sort({ date: -1 }).lean(), Supplier.find({}, 'name').lean()]);
    const nameOf = new Map(suppliers.map((s) => [String(s._id), s.name]));

    const rows = orders.filter((po) =>
      inRange(po.date, from, to) && (!supplierId || String(po.supplierId) === supplierId) && (!status || po.status === status));

    const map = {};
    rows.forEach((po) => {
      const m = (map[String(po.supplierId)] ||= { supplierId: String(po.supplierId), supplierName: nameOf.get(String(po.supplierId)) || '—', orders: 0, pending: 0, units: 0, value: 0 });
      m.orders += 1;
      if (po.status === 'Pending') m.pending += 1;
      m.units += unitsOf(po);
      m.value += Number(po.total) || 0;
    });

    return {
      summary: {
        orders: rows.length,
        pending: rows.filter((p) => p.status === 'Pending').length,
        received: rows.filter((p) => p.status === 'Received').length,
        units: sum(rows, unitsOf),
        value: sum(rows, (p) => p.total),
      },
      bySupplier: Object.values(map).sort((a, b) => b.value - a.value),
      rows: rows.map((po) => ({ id: String(po._id), poNumber: po.poNumber, supplierId: String(po.supplierId), supplierName: nameOf.get(String(po.supplierId)) || '—', date: po.date, units: unitsOf(po), total: po.total, status: po.status })),
    };
  },

  /** Filters: from, to (limit the movement totals) */
  async warehouse({ from, to } = {}) {
    const [warehouses, products, movements] = await Promise.all([
      Warehouse.find().collation({ locale: 'en' }).sort({ name: 1 }).lean(),
      Product.find().lean(),
      StockMovement.find().lean(),
    ]);

    const rows = warehouses.map((w) => {
      const id = String(w._id);
      let units = 0, skus = 0, value = 0;
      products.forEach((p) => {
        const q = Number(p.warehouseStock?.[id]) || 0;
        if (q > 0) { skus += 1; units += q; value += q * (Number(p.price) || 0); }
      });
      const mv = movements.filter((m) => inRange(m.date, from, to) && [m.warehouseId, m.fromWarehouseId, m.toWarehouseId].some((x) => x && String(x) === id));
      const is = (x) => x && String(x) === id;
      return {
        id, name: w.name, location: w.location, capacity: w.capacity, units, skus, value,
        utilization: w.capacity ? round1((units / w.capacity) * 100) : 0,
        locations: (w.locations || []).length,
        unitsIn: sum(mv.filter((m) => m.type === 'Stock In' || (m.type === 'Transfer' && is(m.toWarehouseId))), (m) => m.qty),
        unitsOut: sum(mv.filter((m) => m.type === 'Stock Out' || (m.type === 'Transfer' && is(m.fromWarehouseId))), (m) => m.qty),
        damaged: sum(mv.filter((m) => m.type === 'Damaged'), (m) => m.qty),
      };
    });

    const totalCap = sum(rows, (r) => r.capacity);
    return {
      summary: {
        warehouses: rows.length,
        unitsStored: sum(rows, (r) => r.units),
        stockValue: sum(rows, (r) => r.value),
        overallUtilization: totalCap ? round1((sum(rows, (r) => r.units) / totalCap) * 100) : 0,
      },
      rows,
    };
  },

  /** Numbers for the dashboard cards and charts. ?days=30 controls the Stock In/Out chart and recent movements. */
  async dashboard({ days } = {}) {
    const range = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
    const [products, warehouses, suppliers, orders, movements] = await Promise.all([
      Product.find().lean(),
      Warehouse.countDocuments(),
      Supplier.countDocuments(),
      SalesOrder.find().lean(),
      StockMovement.find().sort({ date: -1 }).lean(),
    ]);
    const nameOf = new Map(products.map((p) => [String(p._id), p.name]));

    const withTotals = products.map((p) => ({ ...p, total: totalOf(p) }));
    const lowStock = withTotals.filter((p) => p.total > 0 && p.total <= (p.reorderLevel ?? 0));
    const outOfStock = withTotals.filter((p) => p.total === 0);

    // Stock In / Stock Out per day for the last `range` days
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (range - 1));
    const perDay = {};
    for (let i = 0; i < range; i += 1) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      perDay[ymd(d)] = { date: ymd(d), stockIn: 0, stockOut: 0 };
    }
    const recent = movements.filter((m) => new Date(m.date) >= start);
    recent.forEach((m) => {
      const day = perDay[ymd(new Date(m.date))];
      if (!day) return;
      if (m.type === 'Stock In') day.stockIn += m.qty;
      if (m.type === 'Stock Out') day.stockOut += m.qty;
    });

    // Delivered sales per calendar month, last 6 months
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, units: 0, revenue: 0 });
    }
    orders.filter((o) => o.status === 'Delivered').forEach((o) => {
      const m = months.find((x) => x.month === dayOf(o.date).slice(0, 7));
      if (m) { m.units += unitsOf(o); m.revenue += Number(o.total) || 0; }
    });

    return {
      kpis: {
        totalProducts: products.length,
        stockValue: sum(withTotals, (p) => p.total * (Number(p.price) || 0)),
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        pendingOrders: orders.filter((o) => o.status === 'Pending').length,
        ordersToShip: orders.filter((o) => o.status === 'Pending' || o.status === 'Confirmed').length,
        warehouses,
        suppliers,
      },
      stockInOut: Object.values(perDay),
      monthlySales: months,
      recentMovements: recent.slice(0, 6).map((m) => ({
        id: String(m._id), type: m.type, productName: m.productId ? nameOf.get(String(m.productId)) || '—' : '—', qty: m.qty, date: m.date, user: m.user, note: m.note,
      })),
      lowStockItems: [...lowStock, ...outOfStock].map((p) => ({ id: String(p._id), sku: p.sku, name: p.name, total: p.total, reorderLevel: p.reorderLevel })),
    };
  },
};
