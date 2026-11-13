import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInventory } from '../../context/InventoryContext';
import { useWarehouseAccess } from './useWarehouseAccess';
import './WarehouseModule.css';

export default function EditWarehouse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { updateWarehouse } = useInventory();
  const { warehouse, loading, canEdit } = useWarehouseAccess(id);
  const [form, setForm] = useState({ name: '', location: '', capacity: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (warehouse) setForm({ name: warehouse.name, location: warehouse.location, capacity: String(warehouse.capacity) });
  }, [warehouse]);

  if (loading) return <div className="page-fade"><div className="skeleton" style={{ height: 300 }} /></div>;
  if (!warehouse) return <div className="page-fade"><div className="empty-state">Warehouse not found</div></div>;
  if (!canEdit) return <div className="page-fade"><div className="empty-state">You do not have permission to edit warehouses.</div></div>;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    if (!form.name.trim()) err.name = 'Name is required';
    if (!form.location.trim()) err.location = 'Location is required';
    if (!form.capacity || Number(form.capacity) <= 0) err.capacity = 'Capacity must be positive';
    setErrors(err);
    if (Object.keys(err).length) return;
    setSaving(true);
    const res = await updateWarehouse(warehouse.id, { name: form.name.trim(), location: form.location.trim(), capacity: Number(form.capacity) });
    setSaving(false);
    if (res.success) navigate('/warehouses');
  };

  return (
    <div className="page-fade">
      <div className="page-header">
        <h1>Edit Warehouse</h1>
        <p>Update warehouse information</p>
      </div>
      <form className="card wh-form-card" onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Warehouse Name</label>
          <input className="form-input" value={form.name} onChange={set('name')} />
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="form-input" value={form.location} onChange={set('location')} />
          {errors.location && <div className="form-error">{errors.location}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Capacity (units)</label>
          <input type="number" className="form-input" value={form.capacity} onChange={set('capacity')} />
          {errors.capacity && <div className="form-error">{errors.capacity}</div>}
        </div>
        <div className="wh-form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/warehouses')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Update Warehouse'}</button>
        </div>
      </form>
    </div>
  );
}
