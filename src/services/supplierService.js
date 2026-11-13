/** supplierService.js — supplier records (Express/MongoDB backend). */
import { api } from './api';

const enc = encodeURIComponent;

export const supplierService = {
  getSuppliers: () => api('/suppliers'),
  addSupplier: (supplier) => api('/suppliers', { method: 'POST', body: supplier }),
  updateSupplier: (id, updates) => api(`/suppliers/${enc(id)}`, { method: 'PUT', body: updates }),
  async deleteSupplier(id) {
    await api(`/suppliers/${enc(id)}`, { method: 'DELETE' });
    return true;
  },
};
