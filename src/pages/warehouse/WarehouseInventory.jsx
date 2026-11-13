import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInventory } from '../../context/InventoryContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { formatNumber } from '../../utils/hooks';
import { useWarehouseAccess } from './useWarehouseAccess';
import { warehouseStore } from './warehouseStore';
import RackBinExplorer from './RackBinExplorer';
import './WarehouseModule.css';

export default function WarehouseInventory() {
  const { warehouseId } = useParams();
  const navigate = useNavigate();
  const { products } = useInventory();
  const { showToast } = useToast();
  const { warehouse, loading, canEdit } = useWarehouseAccess(warehouseId);
  const [items, setItems] = useState([]);
  const [racks, setRacks] = useState([]);
  const [allBins, setAllBins] = useState([]);
  const [form, setForm] = useState({ productId: '', quantity: '', rackId: '', binId: '' });
  const [errors, setErrors] = useState({});
  const [toDelete, setToDelete] = useState(null);

  const reload = async () => {
    try {
      const [i, r, b] = await Promise.all([
        warehouseStore.getInventory(warehouseId),
        warehouseStore.getRacks(warehouseId),
        warehouseStore.getBins(warehouseId),
      ]);
      setItems(i);
      setRacks(r);
      setAllBins(b);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [warehouseId]);

  if (loading) return <div className="page-fade"><div className="skeleton" style={{ height: 300 }} /></div>;
  if (!warehouse) return <div className="page-fade"><div className="empty-state">Warehouse not found</div></div>;

  const bins = form.rackId ? allBins.filter((b) => String(b.rackId) === String(form.rackId)) : [];
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value, ...(k === 'rackId' ? { binId: '' } : {}) });

  const add = async (e) => {
    e.preventDefault();
    const err = {};
    if (!form.productId) err.productId = 'Select a product';
    if (!form.quantity || Number(form.quantity) <= 0) err.quantity = 'Quantity must be positive';
    if (!form.rackId) err.rackId = 'Select a rack';
    if (!form.binId) err.binId = 'Select a bin';
    setErrors(err);
    if (Object.keys(err).length) return;

    try {
      await warehouseStore.addInventory(warehouseId, {
        productId: form.productId,
        quantity: Number(form.quantity),
        rackId: form.rackId,
        binId: form.binId,
      });
    } catch (e2) {
      return showToast('error', e2.message);
    }
    await reload();
    setForm({ productId: '', quantity: '', rackId: '', binId: '' });
    showToast('success', 'Inventory entry added');
  };

  const confirmDelete = async () => {
    try {
      await warehouseStore.deleteInventory(warehouseId, toDelete.id);
      await reload();
      showToast('success', 'Inventory entry deleted');
    } catch (err) {
      showToast('error', err.message);
    }
    setToDelete(null);
  };

  return (
    <div className="page-fade">
      <div className="page-header page-header-row">
        <div>
          <h1>Warehouse Inventory</h1>
          <p>{warehouse.name} — stock placed in racks and bins</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/warehouses')}>Back to Warehouses</button>
      </div>

      <div className="wh-summary">
        <div className="card"><div className="wh-detail-label">Entries</div><div className="wh-detail-value">{items.length}</div></div>
        <div className="card"><div className="wh-detail-label">Units Placed</div><div className="wh-detail-value">{formatNumber(totalQty)}</div></div>
        <div className="card"><div className="wh-detail-label">Racks</div><div className="wh-detail-value">{racks.length}</div></div>
      </div>

      {canEdit && (
        <form className="card wh-section" onSubmit={add}>
          <div className="card-title">Add Inventory</div>
          {racks.length === 0 && (
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 12 }}>
              Create racks and bins first (Manage Racks) so stock can be placed in them.
            </p>
          )}
          <div className="wh-form-grid">
            <div className="form-group">
              <label className="form-label">Product</label>
              <select className="form-select" value={form.productId} onChange={set('productId')}>
                <option value="">— Select product —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
              </select>
              {errors.productId && <div className="form-error">{errors.productId}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input type="number" className="form-input" value={form.quantity} onChange={set('quantity')} placeholder="e.g. 100" />
              {errors.quantity && <div className="form-error">{errors.quantity}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Rack</label>
              <select className="form-select" value={form.rackId} onChange={set('rackId')}>
                <option value="">— Select rack —</option>
                {racks.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {errors.rackId && <div className="form-error">{errors.rackId}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Bin</label>
              <select className="form-select" value={form.binId} onChange={set('binId')} disabled={!form.rackId}>
                <option value="">— Select bin —</option>
                {bins.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {form.rackId && bins.length === 0 && (
                <div className="form-error">This rack has no bins yet — add one under Manage Racks → Manage Bins.</div>
              )}
              {errors.binId && <div className="form-error">{errors.binId}</div>}
            </div>
          </div>
          <div className="wh-form-actions">
            <button type="submit" className="btn btn-primary">Add Inventory</button>
          </div>
        </form>
      )}

      <RackBinExplorer
        racks={racks}
        bins={allBins}
        items={items}
        products={products}
        renderAction={canEdit ? (item) => (
          <button className="btn btn-danger btn-sm" onClick={() => setToDelete(item)}>Delete</button>
        ) : null}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete inventory entry"
        message={`Remove ${toDelete?.productName} from ${toDelete?.rack} / ${toDelete?.bin}?`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
