import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import './WarehouseModule.css';

export default function AddWarehouse() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addWarehouse } = useInventory();
  const canEdit = user?.role === 'Admin' || user?.role === 'Warehouse Manager';
  const [form, setForm] = useState({ name: '', location: '', capacity: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  if (!canEdit) {
    return <div className="page-fade"><div className="empty-state">You do not have permission to add warehouses.</div></div>;
  }

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
    try {
      const res = await addWarehouse({ name: form.name.trim(), location: form.location.trim(), capacity: Number(form.capacity) });
      if (res.success) navigate('/warehouses');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-fade">
      <div className="page-header">
        <h1>Add Warehouse</h1>
        <p>Create a new warehouse</p>
      </div>
      <form className="card wh-form-card" onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Warehouse Name</label>
          <input className="form-input" value={form.name} onChange={set('name')} placeholder="e.g. Mumbai DC" />
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="form-input" value={form.location} onChange={set('location')} placeholder="e.g. Mumbai, Maharashtra" />
          {errors.location && <div className="form-error">{errors.location}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Capacity (units)</label>
          <input type="number" className="form-input" value={form.capacity} onChange={set('capacity')} placeholder="e.g. 5000" />
          {errors.capacity && <div className="form-error">{errors.capacity}</div>}
        </div>
        <div className="wh-form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/warehouses')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add Warehouse'}</button>
        </div>
      </form>
    </div>
  );
}
