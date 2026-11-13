/**
 * orderService.js — sales orders and purchase orders (Express/MongoDB backend).
 * Stock is changed by the server when an order is confirmed / cancelled / returned / deleted
 * and when a purchase order is received — the browser never edits stock itself.
 */
import { api } from './api';

const enc = encodeURIComponent;
const post = (path, body) => api(path, { method: 'POST', body: body || {} });

export const orderService = {
  /* ---------------------------- Sales orders ---------------------------- */
  getSalesOrders: () => api('/sales-orders'),
  createSalesOrder: ({ customer, date, items }) => post('/sales-orders', { customer, date, items }),
  updateSalesOrder: (id, { customer, date, items }) =>
    api(`/sales-orders/${enc(id)}`, { method: 'PUT', body: { customer, date, items } }),

  /** Pending → Confirmed (deducts stock). Returns { order, warehouse, lowStock }. */
  confirmSalesOrder: (id, warehouseId) => post(`/sales-orders/${enc(id)}/confirm`, warehouseId ? { warehouseId } : {}),
  shipSalesOrder: (id) => post(`/sales-orders/${enc(id)}/ship`),
  deliverSalesOrder: (id) => post(`/sales-orders/${enc(id)}/deliver`),
  /** Cancel / return put the stock back. Both return the updated order. */
  cancelSalesOrder: (id) => post(`/sales-orders/${enc(id)}/cancel`),
  returnSalesOrder: (id) => post(`/sales-orders/${enc(id)}/return`),
  /** Returns { success, stockRestored } */
  deleteSalesOrder: (id) => api(`/sales-orders/${enc(id)}`, { method: 'DELETE' }),

  /* -------------------------- Purchase orders --------------------------- */
  getPurchaseOrders: () => api('/purchase-orders'),
  createPurchaseOrder: ({ supplierId, date, items }) => post('/purchase-orders', { supplierId, date, items }),
  /** Pending → Received (adds stock). Returns { order, warehouse }. */
  receivePurchaseOrder: (id, warehouseId) => post(`/purchase-orders/${enc(id)}/receive`, warehouseId ? { warehouseId } : {}),
  cancelPurchaseOrder: (id) => post(`/purchase-orders/${enc(id)}/cancel`),
  async deletePurchaseOrder(id) {
    await api(`/purchase-orders/${enc(id)}`, { method: 'DELETE' });
    return true;
  },
};
