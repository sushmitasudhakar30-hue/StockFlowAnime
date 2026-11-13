import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import KpiCard from '../components/KpiCard';
import Badge from '../components/Badge';
import { StockInOutChart, StockValueTrendChart, SalesUnitsChart, LiveBadge } from '../components/Charts';
import { motion } from 'framer-motion';
import { formatINR, formatDate } from '../utils/hooks';
import { stagger, fadeUp, slideInLeft } from '../motion/variants';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const { products, movements, salesOrders, loading, stockValue, lowStockItems, pendingOrders } = useInventory();

  // scroll-reveal settings shared by every card below the fold
  const inView = { initial: 'hidden', whileInView: 'show', viewport: { once: true, amount: 0.15 } };

  const ordersToShip = useMemo(
    () => salesOrders.filter((o) => o.status === 'Pending' || o.status === 'Confirmed'),
    [salesOrders]
  );

  // Date range filter (applies to the stock charts and Recent Stock Movements)
  const [range, setRange] = useState('30');

  // "Live" charts redraw as soon as stock or orders change; remember when that last happened
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  useEffect(() => { setUpdatedAt(new Date()); }, [products, movements, salesOrders]);

  const filteredMovements = useMemo(() => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (Number(range) - 1));
    return movements.filter((m) => new Date(m.date) >= cutoff);
  }, [movements, range]);

  // Newest first
  const recentMovements = useMemo(
    () => [...filteredMovements].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6),
    [filteredMovements]
  );

  // Calendar-day based overdue check: pending/confirmed for more than 2 days
  const overdueCutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  if (loading) {
    return (
      <div className="page-fade">
        <div className="kpi-grid">
          {[0,1,2,3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 88, borderRadius: 'var(--radius)' }} />
          ))}
        </div>
        <div className="charts-grid">
          <div className="skeleton" style={{ height: 320, borderRadius: 'var(--radius)' }} />
          <div className="skeleton" style={{ height: 320, borderRadius: 'var(--radius)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-fade">
      {/* Page header */}
      <motion.div className="page-header page-header-row" variants={stagger(0.08)} initial="hidden" animate="show">
        <div>
          <motion.h1 variants={fadeUp}>Hi <span className="hero-name">{user?.name?.split(' ')[0]}</span>,</motion.h1>
          <motion.p variants={fadeUp}>Here&apos;s what&apos;s happening across your warehouses today.</motion.p>
        </div>
        <motion.select variants={fadeUp} className="form-select" style={{ width: 'auto' }} value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </motion.select>
      </motion.div>

      {/* KPI cards */}
      <div className="kpi-grid">
        <KpiCard label="Total Products" value={products.length} variant="primary" delay={0}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
        <KpiCard label="Stock Value" value={stockValue} type="currency" variant="teal" delay={80}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>}
        />
        <KpiCard label="Low Stock Items" value={lowStockItems.length} variant="amber" delay={160}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" /></svg>}
        />
        <KpiCard label="Pending Orders" value={pendingOrders.length} variant="danger" delay={240}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>}
        />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <motion.div className="card" variants={fadeUp} {...inView}>
          <div className="card-title">Stock In vs Stock Out</div>
          <StockInOutChart movements={movements} days={Number(range)} />
        </motion.div>
        <motion.div className="card" variants={fadeUp} {...inView} transition={{ delay: 0.1 }}>
          <div className="card-title">
            <span>Stock Value Trend</span>
            <LiveBadge updatedAt={updatedAt} />
          </div>
          <StockValueTrendChart products={products} movements={movements} days={Number(range)} />
        </motion.div>
      </div>

      <div className="charts-grid">
        <motion.div className="card" variants={fadeUp} {...inView}>
          <div className="card-title">
            <span>Sales vs Units Sold</span>
            <LiveBadge updatedAt={updatedAt} />
          </div>
          <SalesUnitsChart salesOrders={salesOrders} />
        </motion.div>
      </div>

      {/* Bottom: orders to ship + recent movements */}
      <motion.div className="dashboard-bottom" variants={stagger(0.12)} {...inView}>
        {/* Orders to ship */}
        <motion.div className="card" variants={fadeUp}>
          <div className="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 18.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM18.5 18.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            Orders to Ship
          </div>
          <motion.div className="orders-ship-list" variants={stagger(0.06, 0.1)} {...inView}>
            {ordersToShip.length === 0 ? (
              <div className="empty-state">No pending orders</div>
            ) : (
              ordersToShip.map((o) => {
                const isOverdue = o.date.slice(0, 10) < overdueCutoff;
                return (
                  <motion.div key={o.id} className="order-ship-item" variants={slideInLeft} whileHover={{ x: 4 }}>
                    <div className="order-ship-info">
                      <span className="order-ship-num">{o.orderNumber}</span>
                      <span className="order-ship-customer">{o.customer}</span>
                      {isOverdue && <span className="order-overdue">Overdue</span>}
                    </div>
                    <div className="order-ship-right">
                      <Badge variant={o.status === 'Confirmed' ? 'primary' : 'warning'}>{o.status}</Badge>
                      <span className="order-ship-amount">{formatINR(o.total)}</span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </motion.div>

        {/* Recent stock movements */}
        <motion.div className="card" variants={fadeUp}>
          <div className="card-title">Recent Stock Movements</div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentMovements.map((m, i) => {
                  const product = products.find((p) => p.id === m.productId);
                  const typeVariant = {
                    'Stock In': 'success',
                    'Stock Out': 'danger',
                    'Transfer': 'teal',
                    'Damaged': 'warning',
                  }[m.type] || 'muted';
                  return (
                    <motion.tr key={m.id} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.35 }}>
                      <td><Badge variant={typeVariant}>{m.type}</Badge></td>
                      <td>{product?.name || '—'}</td>
                      <td>{m.qty}</td>
                      <td className="text-muted">{formatDate(m.date)}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
