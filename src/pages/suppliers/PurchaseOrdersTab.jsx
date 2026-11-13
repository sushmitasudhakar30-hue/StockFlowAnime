import { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatINR, formatDate } from '../../utils/hooks';

// Roles allowed to create / cancel / delete purchase orders.
// Remove a role from this list to take the buttons away from it.
const PO_ROLES = ['Admin', 'Warehouse Manager', 'Inventory Staff', 'Sales Staff'];

const STATUS_VARIANT = { Pending: 'warning', Received: 'success', Cancelled: 'danger' };

const today = () => new Date().toISOString().slice(0, 10);
const emptyLine = () => ({ productId: '', qty: '', price: '' });
const emptyForm = () => ({ supplierId: '', date: today(), items: [emptyLine()] });

export default function PurchaseOrdersTab() {
  const {
    products, suppliers, purchaseOrders, loading,
    markPOReceived, addPurchaseOrder, cancelPurchaseOrder, deletePurchaseOrder,
  } = useInventory();
  const { user } = useAuth();

  // Mark Received changes stock, so it stays Admin / Warehouse Manager only
  const canReceive = user?.role === 'Admin' || user?.role === 'Warehouse Manager';
  const canManage = PO_ROLES.includes(user?.role);

  const [poFilter, setPoFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toCancel, setToCancel] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const getSupplierName = (id) => suppliers.find((s) => s.id === id)?.name || '—';
  const getProductName = (id) => products.find((p) => p.id === id)?.name || id;

  const filteredPOs = poFilter === 'all' ? purchaseOrders : purchaseOrders.filter((p) => p.status === poFilter);

  /* ----------------------------- New PO form ----------------------------- */
  const openNew = () => {
    setForm(emptyForm());
    setErrors({});
    setFormOpen(true);
  };

  const setLine = (index, patch) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }));

  const pickProduct = (index, productId) => {
    const product = products.find((p) => p.id === productId);
    setLine(index, { productId, price: product ? String(product.price) : '' });
  };

  const addLine = () => setForm((f) => ({ ...f, items: [...f.items, emptyLine()] }));
  const removeLine = (index) =>
    setForm((f) => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, i) => i !== index) : f.items }));

  const formTotal = form.items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

  const validate = () => {
    const e = {};
    if (!form.supplierId) e.supplierId = 'Select a supplier';
    if (!form.date) e.date = 'Date is required';
    const lineErrors = form.items.map((it) => {
      if (!it.productId) return 'Select a product';
      if (!(Number(it.qty) > 0) || !Number.isInteger(Number(it.qty))) return 'Quantity must be a whole number above 0';
      if (it.price === '' || !(Number(it.price) >= 0)) return 'Enter a valid price';
      return null;
    });
    if (lineErrors.some(Boolean)) e.items = lineErrors;
    const ids = form.items.map((it) => it.productId).filter(Boolean);
    if (new Set(ids).size !== ids.length) e.duplicate = 'The same product is added more than once';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev?.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const created = await addPurchaseOrder({
        supplierId: form.supplierId,
        date: form.date,
        items: form.items.map((it) => ({ productId: it.productId, qty: Number(it.qty), price: Number(it.price) })),
      });
      if (created) setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  /* --------------------------- Cancel / Delete --------------------------- */
  const confirmCancel = async () => {
    setBusy(true);
    await cancelPurchaseOrder(toCancel.id);
    setBusy(false);
    setToCancel(null);
  };

  const confirmDelete = async () => {
    setBusy(true);
    await deletePurchaseOrder(toDelete.id);
    setBusy(false);
    setToDelete(null);
  };

  if (loading) {
    return <div className="page-fade"><div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius)' }} /></div>;
  }

  return (
    <div className="page-fade">
      <div className="card">
        <div className="card-title">
          <span>Purchase Orders</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            <select className="form-select" style={{ width: 'auto' }} value={poFilter} onChange={(e) => setPoFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="Pending">Pending</option>
              <option value="Received">Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            {canManage && (
              <button className="btn btn-primary" onClick={openNew}>+ New Purchase Order</button>
            )}
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPOs.map((po) => (
                <tr key={po.id}>
                  <td style={{ fontWeight: 600 }}>{po.poNumber}</td>
                  <td>{getSupplierName(po.supplierId)}</td>
                  <td className="text-muted">{formatDate(po.date)}</td>
                  <td>{po.items.map((it) => `${getProductName(it.productId)} ×${it.qty}`).join(', ')}</td>
                  <td style={{ fontWeight: 600 }}>{formatINR(po.total)}</td>
                  <td><Badge variant={STATUS_VARIANT[po.status] || 'muted'}>{po.status}</Badge></td>
                  <td className="text-right">
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      {canReceive && po.status === 'Pending' && (
                        <button className="btn btn-primary btn-sm" onClick={() => markPOReceived(po.id, user?.name)}>
                          Mark Received
                        </button>
                      )}
                      {canManage && po.status === 'Pending' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setToCancel(po)}>Cancel</button>
                      )}
                      {canManage && po.status === 'Cancelled' && (
                        <button className="btn btn-danger btn-sm" onClick={() => setToDelete(po)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPOs.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state">No purchase orders found</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New purchase order */}
      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title="New Purchase Order"
        size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : 'Create Purchase Order'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="po-supplier">Supplier</label>
              <select id="po-supplier" className="form-select" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">Select supplier…</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {errors.supplierId && <div className="form-error">{errors.supplierId}</div>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="po-date">Date</label>
              <input id="po-date" type="date" className="form-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              {errors.date && <div className="form-error">{errors.date}</div>}
            </div>
          </div>

          <label className="form-label">Items</label>
          {form.items.map((it, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr auto', gap: 10, alignItems: 'center' }}>
                <select className="form-select" value={it.productId} onChange={(e) => pickProduct(i, e.target.value)} aria-label={`Product ${i + 1}`}>
                  <option value="">Select product…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                </select>
                <input type="number" min="1" className="form-input" placeholder="Qty" value={it.qty} onChange={(e) => setLine(i, { qty: e.target.value })} aria-label={`Quantity ${i + 1}`} />
                <input type="number" min="0" className="form-input" placeholder="Price ₹" value={it.price} onChange={(e) => setLine(i, { price: e.target.value })} aria-label={`Price ${i + 1}`} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeLine(i)} disabled={form.items.length === 1} aria-label="Remove item">✕</button>
              </div>
              {errors.items?.[i] && <div className="form-error">{errors.items[i]}</div>}
            </div>
          ))}
          {errors.duplicate && <div className="form-error">{errors.duplicate}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addLine}>+ Add item</button>
            <div style={{ fontWeight: 700 }}>Total: {formatINR(formTotal)}</div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toCancel}
        title="Cancel purchase order"
        message={`Cancel ${toCancel?.poNumber}? No stock will be added. You can delete it afterwards.`}
        confirmLabel="Cancel order"
        danger
        busy={busy}
        onConfirm={confirmCancel}
        onClose={() => setToCancel(null)}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete purchase order"
        message={`Permanently delete ${toDelete?.poNumber}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
