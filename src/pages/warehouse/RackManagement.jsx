import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { useWarehouseAccess } from './useWarehouseAccess';
import { warehouseStore } from './warehouseStore';
import './WarehouseModule.css';

export default function RackManagement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { warehouse, loading, canEdit } = useWarehouseAccess(id);
  const [racks, setRacks] = useState([]);
  const [binCounts, setBinCounts] = useState({});
  const [busy, setBusy] = useState(true);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState(null);

  const reload = async () => {
    try {
      const [r, b] = await Promise.all([warehouseStore.getRacks(id), warehouseStore.getBins(id)]);
      const counts = {};
      b.forEach((bin) => { counts[bin.rackId] = (counts[bin.rackId] || 0) + 1; });
      setRacks(r);
      setBinCounts(counts);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [id]);

  if (loading) return <div className="page-fade"><div className="skeleton" style={{ height: 300 }} /></div>;
  if (!warehouse) return <div className="page-fade"><div className="empty-state">Warehouse not found</div></div>;

  const binCount = (rackId) => binCounts[rackId] || 0;

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Please enter a rack name');
    if (racks.some((r) => r.name.toLowerCase() === name.trim().toLowerCase())) return setError('A rack with this name already exists');
    try {
      await warehouseStore.addRack(id, name);
    } catch (err) {
      return setError(err.message);
    }
    await reload();
    setName('');
    setError('');
    showToast('success', 'Rack added');
  };

  const confirmDelete = async () => {
    try {
      await warehouseStore.deleteRack(id, toDelete.id);
      await reload();
      showToast('success', 'Rack deleted');
    } catch (err) {
      showToast('error', err.message);
    }
    setToDelete(null);
  };

  return (
    <div className="page-fade">
      <div className="page-header page-header-row">
        <div>
          <h1>Rack Management</h1>
          <p>{warehouse.name} — manage racks for this warehouse</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/warehouses')}>Back to Warehouses</button>
      </div>

      {canEdit && (
        <form className="card wh-section" onSubmit={add}>
          <div className="wh-inline-form">
            <div className="form-group">
              <label className="form-label">Rack Name</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rack A" />
              {error && <div className="form-error">{error}</div>}
            </div>
            <button type="submit" className="btn btn-primary">Add Rack</button>
          </div>
        </form>
      )}

      <div className="card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Rack Name</th><th>Bins</th><th>Action</th></tr></thead>
            <tbody>
              {racks.map((rack) => (
                <tr key={rack.id}>
                  <td>{rack.name}</td>
                  <td>{binCount(rack.id)}</td>
                  <td>
                    <div className="wh-row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/warehouses/${id}/racks/${rack.id}/bins`)}>Manage Bins</button>
                      {canEdit && <button className="btn btn-danger btn-sm" onClick={() => setToDelete(rack)}>Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!busy && racks.length === 0 && <tr><td colSpan={3}><div className="empty-state">No racks found</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete rack"
        message={`Delete ${toDelete?.name}? Its bins will be removed as well.`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
