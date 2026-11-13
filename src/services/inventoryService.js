/**
 * inventoryService.js — products, warehouses and stock movements.
 * Talks to the Express/MongoDB backend. Stock quantities are changed ONLY by the server
 * (POST /stock-movements, order confirm/cancel/return, purchase-order receive).
 */
import { api } from './api';

const enc = encodeURIComponent;

export const inventoryService = {
  /* ------------------------------ Products ------------------------------ */
  getProducts: () => api('/products'),
  getProduct: (id) => api(`/products/${enc(id)}`),
  getCategories: () => api('/products/categories'),
  addProduct: (product) => api('/products', { method: 'POST', body: product }),
  updateProduct: (id, updates) => api(`/products/${enc(id)}`, { method: 'PUT', body: updates }),
  async deleteProduct(id) {
    await api(`/products/${enc(id)}`, { method: 'DELETE' });
    return true;
  },

  /* ----------------------------- Warehouses ----------------------------- */
  getWarehouses: () => api('/warehouses'),
  getWarehouse: (id) => api(`/warehouses/${enc(id)}`),
  addWarehouse: (warehouse) => api('/warehouses', { method: 'POST', body: warehouse }),
  updateWarehouse: (id, fields) => api(`/warehouses/${enc(id)}`, { method: 'PUT', body: fields }),
  async deleteWarehouse(id) {
    await api(`/warehouses/${enc(id)}`, { method: 'DELETE' });
    return true;
  },
  /** Returns the updated warehouse (with its locations). */
  addLocation: (warehouseId, location) =>
    api(`/warehouses/${enc(warehouseId)}/locations`, { method: 'POST', body: location }),

  /* --------------------------- Stock movements -------------------------- */
  getMovements: () => api('/stock-movements'),

  /**
   * Records a movement AND changes the stock on the server.
   * Returns { movement, product, lowStock } — `product` is the updated product.
   * For a Transfer pass fromWarehouseId / toWarehouseId instead of warehouseId.
   */
  createMovement: (movement) => api('/stock-movements', { method: 'POST', body: movement }),
};
