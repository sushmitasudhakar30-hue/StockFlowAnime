import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { useWarehouseAccess } from './useWarehouseAccess';
import { warehouseStore } from './warehouseStore';
import './WarehouseModule.css';

export default function BinManagement() {
  const { warehouseId, rackId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { warehouse, loading, canEdit } = useWarehouseAccess(warehouseId);
  const [bins, setBins] = useState([]);
  const [rack, setRack] = useState(null);
  const [busy, setBusy] = useState(true);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState(null);

  const reload = async () => {
    try {
      const [b, racks] = await Promise.all([warehouseStore.getBins(warehouseId, rackId), warehouseStore.getRacks(warehouseId)]);
      setBins(b);
      setRack(racks.find((r) => String(r.id) === String(rackId)) || null);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [warehouseId, rackId]);

  if (loading) return <div className="page-fade"><div className="skeleton" style={{ height: 300 }} /></div>;
  if (!warehouse) return <div className="page-fade"><div className="empty-state">Warehouse not found</div></div>;

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Please enter a bin name');
    if (bins.some((b) => b.name.toLowerCase() === name.trim().toLowerCase())) return setError('A bin with this name already exists');
    try {
      await warehouseStore.addBin(warehouseId, rackId, name);
    } catch (err) {
      return setError(err.message);
    }
    await reload();
    setName('');
    setError('');
    showToast('success', 'Bin added');
  };

  const confirmDelete = async () => {
    try {
      await warehouseStore.deleteBin(warehouseId, toDelete.id);
      await reload();
      showToast('success', 'Bin deleted');
    } catch (err) {
      showToast('error', err.message);
    }
    setToDelete(null);
  };

  return (
    <div className="page-fade">
      <div className="page-header page-header-row">
        <div>
          <h1>Bin Management</h1>
          <p>{warehouse.name}{rack ? ` — ${rack.name}` : ''}</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate(`/warehouses/${warehouseId}/racks`)}>Back to Racks</button>
      </div>

      {canEdit && (
        <form className="card wh-section" onSubmit={add}>
          <div className="wh-inline-form">
            <div className="form-group">
              <label className="form-label">Bin Name</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bin A1" />
              {error && <div className="form-error">{error}</div>}
            </div>
            <button type="submit" className="btn btn-primary">Add Bin</button>
          </div>
        </form>
      )}

      <div className="card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Bin Name</th><th>Action</th></tr></thead>
            <tbody>
              {bins.map((bin) => (
                <tr key={bin.id}>
                  <td>{bin.name}</td>
                  <td>{canEdit && <button className="btn btn-danger btn-sm" onClick={() => setToDelete(bin)}>Delete</button>}</td>
                </tr>
              ))}
              {!busy && bins.length === 0 && <tr><td colSpan={2}><div className="empty-state">No bins found</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete bin"
        message={`Delete ${toDelete?.name}?`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
