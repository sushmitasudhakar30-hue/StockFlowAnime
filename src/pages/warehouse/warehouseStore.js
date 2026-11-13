/* API helpers for the rack / bin / warehouse-inventory module (Express/MongoDB backend).
   Every function is async and returns the saved data from the server. */
import { api } from '../../services/api';

const enc = encodeURIComponent;
const base = (warehouseId) => `/warehouses/${enc(warehouseId)}`;

export const warehouseStore = {
  /* ---- Racks ---- */
  getRacks: (warehouseId) => api(`${base(warehouseId)}/racks`),
  addRack: (warehouseId, name) => api(`${base(warehouseId)}/racks`, { method: 'POST', body: { name: name.trim() } }),
  async deleteRack(warehouseId, rackId) {
    await api(`${base(warehouseId)}/racks/${enc(rackId)}`, { method: 'DELETE' });
    return true;
  },

  /* ---- Bins ---- */
  getBins: (warehouseId, rackId) =>
    rackId === undefined
      ? api(`${base(warehouseId)}/bins`)
      : api(`${base(warehouseId)}/racks/${enc(rackId)}/bins`),
  addBin: (warehouseId, rackId, name) =>
    api(`${base(warehouseId)}/racks/${enc(rackId)}/bins`, { method: 'POST', body: { name: name.trim() } }),
  async deleteBin(warehouseId, binId) {
    await api(`${base(warehouseId)}/bins/${enc(binId)}`, { method: 'DELETE' });
    return true;
  },

  /* ---- Warehouse inventory entries (stock placed in rack / bin) ---- */
  getInventory: (warehouseId) => api(`${base(warehouseId)}/inventory`),
  addInventory: (warehouseId, entry) =>
    api(`${base(warehouseId)}/inventory`, {
      method: 'POST',
      body: { productId: entry.productId, quantity: entry.quantity, rackId: entry.rackId, binId: entry.binId },
    }),
  async deleteInventory(warehouseId, itemId) {
    await api(`${base(warehouseId)}/inventory/${enc(itemId)}`, { method: 'DELETE' });
    return true;
  },
};
