import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useReveal } from '../utils/hooks';
import { useToast } from '../components/Toast';
import './Users.css';

const emptyForm = { name: '', email: '', password: '', role: 'Inventory Staff' };

const roleVariant = {
  Admin: 'danger',
  'Warehouse Manager': 'primary',
  'Inventory Staff': 'teal',
  'Sales Staff': 'warning',
};

export default function Users() {
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [ref, revealed] = useReveal();

  useEffect(() => {
    userService.getUsers()
      .then((u) => setUsers(u))
      .catch((err) => showToast('error', err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!form.email.includes('@')) e.email = 'Invalid email';
    if (!editId && (!form.password || form.password.length < 6)) e.password = 'Password must be 6+ chars';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setEditId(u.id);
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      if (editId) {
        const updates = { name: form.name, email: form.email, role: form.role };
        if (form.password) updates.password = form.password;
        const updated = await userService.updateUser(editId, updates);
        setUsers((prev) => prev.map((u) => (u.id === editId ? updated : u)));
        showToast('success', 'User updated');
      } else {
        const created = await userService.addUser({ ...form, avatar: form.name.split(' ').map((s) => s[0]).join('').toUpperCase() });
        setUsers((prev) => [...prev, created]);
        showToast('success', 'User added');
      }
      setModalOpen(false);
    } catch (err) {
      // Email problems show under the email box, everything else as a toast
      if (/email/i.test(err.message)) setErrors({ email: err.message });
      else showToast('error', err.message);
    }
  };

  const toggleActive = async (id) => {
    try {
      const updated = await userService.toggleUserActive(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      showToast('success', `User ${updated.active ? 'activated' : 'deactivated'}`);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await userService.deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      showToast('success', `${deleteTarget.name} was deleted`);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return <div className="page-fade"><div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius)' }} /></div>;
  }

  return (
    <div className="page-fade">
      <div className="page-header page-header-row">
        <div>
          <h1>User Management</h1>
          <p>Manage team members, roles, and access</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Add User
        </button>
      </div>

      <div ref={ref} className={`card reveal ${revealed ? 'revealed' : ''}`}>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{u.avatar}</div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td className="text-muted">{u.email}</td>
                  <td><Badge variant={roleVariant[u.role] || 'muted'}>{u.role}</Badge></td>
                  <td>
                    <span className={`user-status ${u.active ? 'active' : 'inactive'}`}>
                      <span className="status-dot" />
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn-icon" onClick={() => openEdit(u)} aria-label="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button className="btn-icon" onClick={() => toggleActive(u.id)} aria-label="Toggle active">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {u.active
                            ? <path d="M18.36 5.64a9 9 0 11-12.73 0M12 2v10" />
                            : <path d="M12 2v10M18.36 5.64a9 9 0 11-12.73 0" />}
                        </svg>
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => setDeleteTarget(u)}
                        disabled={u.id === currentUser?.id}
                        title={u.id === currentUser?.id ? "You can't delete your own account" : 'Delete user'}
                        aria-label="Delete user"
                        style={u.id === currentUser?.id ? { opacity: 0.4, cursor: 'not-allowed' } : { color: 'var(--danger, #dc2626)' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit user */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit User' : 'Add User'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>{editId ? 'Update' : 'Add'}</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Doe" />
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. john@stockflow.in" />
          {errors.email && <div className="form-error">{errors.email}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">{editId ? 'New Password (leave blank to keep)' : 'Password'}</label>
          <input type="password" className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          {errors.password && <div className="form-error">{errors.password}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Role</label>
          <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option>Admin</option>
            <option>Warehouse Manager</option>
            <option>Inventory Staff</option>
            <option>Sales Staff</option>
          </select>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete User"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
          </>
        }
      >
        <p>
          Are you sure you want to permanently delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})?
          This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}