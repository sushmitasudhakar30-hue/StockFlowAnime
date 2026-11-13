import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  BarController,
  LineController,
  DoughnutController,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import './Charts.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement,
  BarController, LineController, DoughnutController, Filler, Tooltip, Legend
);

const gridColor = () => {
  const theme = document.documentElement.getAttribute('data-theme');
  return theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
};

const tickColor = () => {
  const theme = document.documentElement.getAttribute('data-theme');
  return theme === 'dark' ? '#8893a8' : '#7b8496';
};

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: { font: { size: 11 }, color: tickColor(), usePointStyle: true, padding: 16 },
    },
    tooltip: {
      backgroundColor: 'rgba(28,34,48,0.9)',
      padding: 12,
      cornerRadius: 6,
      titleFont: { size: 12 },
      bodyFont: { size: 12 },
    },
  },
  animation: { duration: 800, easing: 'easeOutQuart' },
};

/* ---- Stock In vs Stock Out (area + line combo) ---- */
export function StockInOutChart({ movements, days = 7 }) {
  const last7Days = getStockFlow(movements, days);

  const data = {
    labels: last7Days.labels,
    datasets: [
      {
        label: 'Stock In',
        data: last7Days.stockIn,
        borderColor: '#1f9d6b',
        backgroundColor: 'rgba(31,157,107,0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#1f9d6b',
      },
      {
        label: 'Stock Out',
        data: last7Days.stockOut,
        borderColor: '#d64545',
        backgroundColor: 'rgba(214,69,69,0.10)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#d64545',
      },
    ],
  };

  const options = {
    ...baseOptions,
    scales: {
      y: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: tickColor() } },
      x: { grid: { display: false }, ticks: { color: tickColor() } },
    },
  };

  return (
    <div className="chart-wrapper">
      <Line data={data} options={options} />
    </div>
  );
}

/* ---- Stock Value Trend (live area chart) ---- */
// Built from the real movement history, so it moves as soon as stock changes (Stock In / Out / Damaged,
// received purchase orders, confirmed sales orders). The last point is always today's stock value.
// Note: past points are valued at CURRENT product prices (price history is not stored).
const fmtShort = (v) => {
  const n = Math.abs(v);
  if (n >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
  return `₹${Math.round(v)}`;
};
const fmtFull = (v) => `₹${Math.round(v).toLocaleString('en-IN')}`;

export function StockValueTrendChart({ products = [], movements = [], days = 30 }) {
  const series = getStockValueSeries(products, movements, days);
  const lastIdx = series.values.length - 1;

  const data = {
    labels: series.labels,
    datasets: [
      {
        label: 'Stock Value (₹)',
        data: series.values,
        borderColor: '#6b4fbb',
        backgroundColor: 'rgba(107,79,187,0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: series.values.map((_, i) => (i === lastIdx ? 6 : 2)),
        pointHoverRadius: 6,
        pointBackgroundColor: '#6b4fbb',
      },
    ],
  };

  const options = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: { display: false },
      tooltip: {
        ...baseOptions.plugins.tooltip,
        callbacks: { label: (ctx) => ` Stock value: ${fmtFull(ctx.parsed.y)}` },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grace: '10%',
        grid: { color: gridColor() },
        ticks: { color: tickColor(), callback: (val) => fmtShort(val) },
      },
      x: { grid: { display: false }, ticks: { color: tickColor(), maxTicksLimit: 8 } },
    },
  };

  return (
    <div className="chart-wrapper">
      <Line data={data} options={options} />
    </div>
  );
}

/* Small pulsing "Live" pill + last update time, shown next to chart titles */
export function LiveBadge({ updatedAt }) {
  const time = updatedAt
    ? updatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';
  return (
    <span className="live-badge" title="Updates instantly when stock or orders change">
      <span className="live-dot" />
      Live{time ? <span className="live-time"> · {time}</span> : null}
    </span>
  );
}

/* ---- Sales vs Units Sold (bar + line combo) ---- */
export function SalesUnitsChart({ salesOrders }) {
  const monthly = getMonthlySales(salesOrders);

  const data = {
    labels: monthly.labels,
    datasets: [
      {
        type: 'bar',
        label: 'Sales (₹)',
        data: monthly.revenue,
        backgroundColor: 'rgba(107,79,187,0.7)',
        borderRadius: 6,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: 'Units Sold',
        data: monthly.units,
        borderColor: '#f2b705',
        backgroundColor: '#f2b705',
        tension: 0.35,
        pointRadius: 4,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    ...baseOptions,
    scales: {
      y: {
        type: 'linear',
        position: 'left',
        beginAtZero: true,
        grid: { color: gridColor() },
        ticks: {
          color: tickColor(),
          callback: (val) => `₹${(val / 1000).toFixed(0)}k`,
        },
      },
      y1: {
        type: 'linear',
        position: 'right',
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: { color: tickColor() },
      },
      x: { grid: { display: false }, ticks: { color: tickColor() } },
    },
  };

  return (
    <div className="chart-wrapper">
      <Bar data={data} options={options} />
    </div>
  );
}

/* ---- Category Distribution (doughnut) ---- */
export function CategoryChart({ products }) {
  const categoryTotals = {};
  products.forEach((p) => {
    const total = Object.values(p.warehouseStock || {}).reduce((a, b) => a + b, 0);
    categoryTotals[p.category] = (categoryTotals[p.category] || 0) + total;
  });

  const data = {
    labels: Object.keys(categoryTotals),
    datasets: [
      {
        data: Object.values(categoryTotals),
        backgroundColor: ['#6b4fbb', '#7fd1d9', '#f2b705', '#1f9d6b'],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    ...baseOptions,
    cutout: '60%',
    plugins: {
      ...baseOptions.plugins,
      legend: { ...baseOptions.plugins.legend, position: 'right' },
    },
  };

  return (
    <div className="chart-wrapper chart-doughnut">
      <Doughnut data={data} options={options} />
    </div>
  );
}

/* ---- Helpers ---- */
const toLocalISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;


// Stock value at the end of each day/week, rebuilt backwards from today's stock using the movement log.
// Stock In adds value, Stock Out / Damaged remove it, Transfers do not change the total.
function getStockValueSeries(products, movements, days) {
  const priceOf = new Map(products.map((p) => [p.id, Number(p.price) || 0]));
  const current = products.reduce(
    (sum, p) => sum + Object.values(p.warehouseStock || {}).reduce((a, b) => a + b, 0) * (Number(p.price) || 0),
    0
  );

  const deltaByDay = {};
  movements.forEach((m) => {
    const price = priceOf.get(m.productId);
    if (price === undefined) return; // product no longer exists
    const sign = m.type === 'Stock In' ? 1 : m.type === 'Stock Out' || m.type === 'Damaged' ? -1 : 0;
    if (!sign) return;
    const day = toLocalISO(new Date(m.date));
    deltaByDay[day] = (deltaByDay[day] || 0) + sign * m.qty * price;
  });
  const movementDays = Object.keys(deltaByDay);

  const weekly = days > 30;
  const bucketSize = weekly ? 7 : 1;
  const bucketCount = Math.ceil(days / bucketSize);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const labels = [];
  const values = [];
  for (let b = bucketCount - 1; b >= 0; b--) {
    const end = new Date(today);
    end.setDate(end.getDate() - b * bucketSize);
    const endISO = toLocalISO(end);
    const laterChange = movementDays.filter((d) => d > endISO).reduce((sum, d) => sum + deltaByDay[d], 0);
    values.push(Math.max(0, Math.round(current - laterChange)));
    labels.push(b === 0 ? 'Today' : `${String(end.getDate()).padStart(2, '0')} ${MONTHS[end.getMonth()]}`);
  }
  return { labels, values };
}

// Daily buckets for up to 30 days, weekly buckets for longer ranges (e.g. 90 days)
function getStockFlow(movements, days) {
  const weekly = days > 30;
  const bucketSize = weekly ? 7 : 1;
  const bucketCount = Math.ceil(days / bucketSize);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const labels = [];
  const stockIn = [];
  const stockOut = [];

  // Pre-compute local calendar day for each movement
  const rows = movements.map((m) => ({
    day: toLocalISO(new Date(m.date)),
    type: m.type,
    qty: m.qty,
  }));

  for (let b = bucketCount - 1; b >= 0; b--) {
    const end = new Date(today);
    end.setDate(end.getDate() - b * bucketSize);
    const start = new Date(end);
    start.setDate(start.getDate() - (bucketSize - 1));
    const from = toLocalISO(start);
    const to = toLocalISO(end);

    const labelDate = weekly ? start : end;
    labels.push(`${String(labelDate.getDate()).padStart(2, '0')} ${MONTHS[labelDate.getMonth()]}`);

    const inRange = rows.filter((r) => r.day >= from && r.day <= to);
    stockIn.push(inRange.filter((r) => r.type === 'Stock In').reduce((s, r) => s + r.qty, 0));
    stockOut.push(
      inRange.filter((r) => r.type === 'Stock Out' || r.type === 'Damaged').reduce((s, r) => s + r.qty, 0)
    );
  }

  return { labels, stockIn, stockOut };
}

// Last 6 calendar months, grouped by YYYY-MM
function getMonthlySales(salesOrders) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: MONTHS[d.getMonth()],
    };
  });

  const revenue = months.map(() => 0);
  const units = months.map(() => 0);

  salesOrders.forEach((o) => {
    if (o.status === 'Cancelled' || o.status === 'Returned') return; // not real sales
    const idx = months.findIndex((m) => m.key === o.date.slice(0, 7));
    if (idx >= 0) {
      revenue[idx] += o.total;
      units[idx] += o.items.reduce((s, i) => s + i.qty, 0);
    }
  });

  return { labels: months.map((m) => m.label), revenue, units };
}
