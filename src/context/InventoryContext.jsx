import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { inventoryService } from '../services/inventoryService';
import { orderService } from '../services/orderService';
import { supplierService } from '../services/supplierService';

const InventoryContext = createContext(null);

const byName = (a, b) => a.name.localeCompare(b.name);

export function InventoryProvider({ children }) {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [movements, setMovements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Toast / notification callbacks — set by wrappers in App.jsx so the context can trigger them
  const toastRef = useRef(null);
  const notifyRef = useRef(null);
  const setToastFn = useCallback((fn) => { toastRef.current = fn; }, []);
  const setNotifyFn = useCallback((fn) => { notifyRef.current = fn; }, []);
  const showToast = useCallback((type, message) => { if (toastRef.current) toastRef.current(type, message); }, []);
  /** Ask the notification bell to re-load (the server creates low-stock alerts itself). */
  const refreshNotifications = useCallback(() => { if (notifyRef.current) notifyRef.current(); }, []);

  /* ------------------------------ Loading ------------------------------ */
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [p, w, m, po, so, sup] = await Promise.all([
        inventoryService.getProducts(),
        inventoryService.getWarehouses(),
        inventoryService.getMovements(),
        orderService.getPurchaseOrders(),
        orderService.getSalesOrders(),
        supplierService.getSuppliers(),
      ]);
      setProducts(p);
      setWarehouses(w);
      setMovements(m);
      setPurchaseOrders(po);
      setSalesOrders(so);
      setSuppliers(sup);
    } catch (err) {
      setError(err.message || 'Could not load data from the server');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load when a user logs in, clear everything when they log out
  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setProducts([]); setWarehouses([]); setMovements([]);
      setSuppliers([]); setPurchaseOrders([]); setSalesOrders([]);
      setError('');
      setLoading(false);
      return;
    }
    loadAll();
  }, [userId, loadAll]);

  /** Re-read products + movements (+ bell) after the server changed stock on its own. */
  const refreshStock = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([inventoryService.getProducts(), inventoryService.getMovements()]);
      setProducts(p);
      setMovements(m);
    } catch (err) {
      showToast('error', err.message || 'Could not refresh stock');
    }
    refreshNotifications();
  }, [showToast, refreshNotifications]);

  /** Runs an API action; on failure shows the server's message and returns { success: false }. */
  const attempt = useCallback(async (fn, fallback = 'Something went wrong') => {
    try {
      return await fn();
    } catch (err) {
      showToast('error', err.message || fallback);
      return { success: false, error: err.message || fallback };
    }
  }, [showToast]);

  /* ------------------------------ Helpers ------------------------------ */
  const getProductTotalStock = useCallback((product) => (
    Object.values(product.warehouseStock || {}).reduce((a, b) => a + (Number(b) || 0), 0)
  ), []);

  const getProductStockAt = useCallback((productId, warehouseId) => {
    const p = products.find((pr) => pr.id === productId);
    return Number(p?.warehouseStock?.[warehouseId]) || 0;
  }, [products]);

  /* ------------------------- Stock movements --------------------------- */
  // The server changes the stock, logs the movement and creates low-stock alerts.
  const applyMovement = useCallback(async (payload, successMessage, successType = 'success') => (
    attempt(async () => {
      const { movement, product, lowStock } = await inventoryService.createMovement(payload);
      setMovements((prev) => [movement, ...prev]);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, ...product } : p)));
      showToast(successType, successMessage);
      if (lowStock) {
        showToast('warning', `Low stock alert: ${product.name} (${product.totalStock} units left)`);
        refreshNotifications();
      }
      return { success: true };
    })
  ), [attempt, showToast, refreshNotifications]);

  const stockIn = useCallback(({ productId, warehouseId, qty, note }) =>
    applyMovement({ type: 'Stock In', productId, warehouseId, qty, note: note || '' }, `Stock In: ${qty} units added`), [applyMovement]);

  const stockOut = useCallback(({ productId, warehouseId, qty, note }) =>
    applyMovement({ type: 'Stock Out', productId, warehouseId, qty, note: note || '' }, `Stock Out: ${qty} units removed`), [applyMovement]);

  const transferStock = useCallback(({ productId, fromWarehouseId, toWarehouseId, qty, note }) => {
    if (fromWarehouseId === toWarehouseId) {
      showToast('error', 'Source and destination must be different');
      return Promise.resolve({ success: false, error: 'Same warehouse' });
    }
    return applyMovement({ type: 'Transfer', productId, fromWarehouseId, toWarehouseId, qty, note: note || '' }, `Transfer: ${qty} units moved`);
  }, [applyMovement, showToast]);

  const reportDamaged = useCallback(({ productId, warehouseId, qty, reason }) =>
    applyMovement({ type: 'Damaged', productId, warehouseId, qty, reason: reason || '' }, `Damaged: ${qty} units removed`, 'warning'), [applyMovement]);

  /* ------------------------------ Products ----------------------------- */
  const addProduct = useCallback((product) => attempt(async () => {
    const created = await inventoryService.addProduct(product);
    setProducts((prev) => [...prev, created].sort(byName));
    showToast('success', `Product "${created.name}" added`);
    return { success: true };
  }), [attempt, showToast]);

  const updateProduct = useCallback((id, updates) => attempt(async () => {
    const updated = await inventoryService.updateProduct(id, updates);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)).sort(byName));
    showToast('success', 'Product updated');
    return { success: true };
  }), [attempt, showToast]);

  const deleteProduct = useCallback((id) => attempt(async () => {
    await inventoryService.deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast('success', 'Product deleted');
    return { success: true };
  }), [attempt, showToast]);

  /* ----------------------------- Warehouses ---------------------------- */
  const addWarehouse = useCallback((warehouse) => attempt(async () => {
    const created = await inventoryService.addWarehouse(warehouse);
    setWarehouses((prev) => [...prev, created].sort(byName));
    showToast('success', `Warehouse "${created.name}" added`);
    return { success: true };
  }), [attempt, showToast]);

  const updateWarehouse = useCallback((id, fields) => attempt(async () => {
    const updated = await inventoryService.updateWarehouse(id, fields);
    setWarehouses((prev) => prev.map((w) => (w.id === id ? updated : w)).sort(byName));
    showToast('success', 'Warehouse updated');
    return { success: true };
  }, 'Could not update warehouse'), [attempt, showToast]);

  const deleteWarehouse = useCallback((id) => attempt(async () => {
    await inventoryService.deleteWarehouse(id);
    setWarehouses((prev) => prev.filter((w) => w.id !== id));
    showToast('success', 'Warehouse deleted');
    await refreshStock(); // the server removed the stock held there and detached its history
    return { success: true };
  }, 'Could not delete warehouse'), [attempt, showToast, refreshStock]);

  const addLocation = useCallback((warehouseId, location) => attempt(async () => {
    const updated = await inventoryService.addLocation(warehouseId, location);
    setWarehouses((prev) => prev.map((w) => (w.id === warehouseId ? updated : w)));
    showToast('success', 'Location added');
    return { success: true };
  }), [attempt, showToast]);

  /* ------------------------------ Suppliers ---------------------------- */
  const addSupplier = useCallback(async (supplier) => {
    try {
      const created = await supplierService.addSupplier(supplier);
      setSuppliers((prev) => [...prev, created].sort(byName));
      showToast('success', `Supplier "${created.name}" added`);
      return created;
    } catch (err) {
      showToast('error', err.message || 'Could not add supplier');
      return null;
    }
  }, [showToast]);

  const updateSupplier = useCallback(async (id, supplier) => {
    try {
      const updated = await supplierService.updateSupplier(id, supplier);
      setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)).sort(byName));
      // keep PO supplier names in sync
      setPurchaseOrders((prev) => prev.map((po) => (po.supplierId === id ? { ...po, supplierName: updated.name } : po)));
      showToast('success', `Supplier "${updated.name}" updated`);
      return updated;
    } catch (err) {
      showToast('error', err.message || 'Could not update supplier');
      return null;
    }
  }, [showToast]);

  const deleteSupplier = useCallback((id) => attempt(async () => {
    await supplierService.deleteSupplier(id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    showToast('success', 'Supplier deleted');
    return { success: true };
  }, 'Could not delete supplier'), [attempt, showToast]);

  /* --------------------------- Purchase orders ------------------------- */
  const markPOReceived = useCallback((poId) => attempt(async () => {
    const { order } = await orderService.receivePurchaseOrder(poId);
    setPurchaseOrders((prev) => prev.map((p) => (p.id === poId ? order : p)));
    await refreshStock(); // server added the items to stock
    showToast('success', `PO ${order.poNumber} marked as Received — stock updated`);
    return { success: true };
  }, 'Could not receive purchase order'), [attempt, showToast, refreshStock]);

  const addPurchaseOrder = useCallback(async (data) => {
    try {
      const created = await orderService.createPurchaseOrder(data);
      setPurchaseOrders((prev) => [created, ...prev]);
      showToast('success', `Purchase order ${created.poNumber} created`);
      return created;
    } catch (err) {
      showToast('error', err.message || 'Could not create purchase order');
      return null;
    }
  }, [showToast]);

  const cancelPurchaseOrder = useCallback((poId) => attempt(async () => {
    const updated = await orderService.cancelPurchaseOrder(poId);
    setPurchaseOrders((prev) => prev.map((p) => (p.id === poId ? updated : p)));
    showToast('success', `PO ${updated.poNumber} cancelled`);
    return { success: true };
  }, 'Could not cancel purchase order'), [attempt, showToast]);

  const deletePurchaseOrder = useCallback((poId) => attempt(async () => {
    const po = purchaseOrders.find((p) => p.id === poId);
    await orderService.deletePurchaseOrder(poId);
    setPurchaseOrders((prev) => prev.filter((p) => p.id !== poId));
    showToast('success', `PO ${po?.poNumber || ''} deleted`);
    return { success: true };
  }, 'Could not delete purchase order'), [attempt, purchaseOrders, showToast]);

  /* ----------------------------- Sales orders -------------------------- */
  const replaceSalesOrder = useCallback((order) => {
    setSalesOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
  }, []);

  const addSalesOrder = useCallback(({ customer, date, items }) => attempt(async () => {
    const created = await orderService.createSalesOrder({ customer, date, items });
    setSalesOrders((prev) => [created, ...prev]);
    showToast('success', `Order ${created.orderNumber} created`);
    return { success: true, order: created };
  }, 'Could not create order'), [attempt, showToast]);

  const updateSalesOrder = useCallback((orderId, { customer, date, items }) => attempt(async () => {
    const updated = await orderService.updateSalesOrder(orderId, { customer, date, items });
    replaceSalesOrder(updated);
    showToast('success', `Order ${updated.orderNumber} updated`);
    return { success: true, order: updated };
  }, 'Could not update order'), [attempt, replaceSalesOrder, showToast]);

  // Pending → Confirmed: the server deducts the stock
  const confirmSalesOrder = useCallback((orderId) => attempt(async () => {
    const { order, lowStock } = await orderService.confirmSalesOrder(orderId);
    replaceSalesOrder(order);
    await refreshStock();
    showToast('success', `Order ${order.orderNumber} confirmed — stock updated`);
    if (lowStock?.length) showToast('warning', `Low stock alert: ${lowStock.join(', ')}`);
    return { success: true };
  }, 'Could not confirm order'), [attempt, replaceSalesOrder, refreshStock, showToast]);

  // Confirmed → Shipped → Delivered
  const updateSalesOrderStatus = useCallback((orderId, status) => attempt(async () => {
    let updated;
    if (status === 'Shipped') updated = await orderService.shipSalesOrder(orderId);
    else if (status === 'Delivered') updated = await orderService.deliverSalesOrder(orderId);
    else throw new Error(`Cannot change an order to "${status}" from here`);
    replaceSalesOrder(updated);
    showToast('success', `Order status updated to ${status}`);
    return { success: true };
  }, 'Could not update order status'), [attempt, replaceSalesOrder, showToast]);

  const cancelSalesOrder = useCallback((orderId) => attempt(async () => {
    const updated = await orderService.cancelSalesOrder(orderId);
    replaceSalesOrder(updated);
    await refreshStock();
    showToast('success', `Order ${updated.orderNumber} cancelled — stock restored`);
    return { success: true };
  }, 'Could not cancel order'), [attempt, replaceSalesOrder, refreshStock, showToast]);

  const returnSalesOrder = useCallback((orderId) => attempt(async () => {
    const updated = await orderService.returnSalesOrder(orderId);
    replaceSalesOrder(updated);
    await refreshStock();
    showToast('success', `Order ${updated.orderNumber} returned — stock restored`);
    return { success: true };
  }, 'Could not mark order as returned'), [attempt, replaceSalesOrder, refreshStock, showToast]);

  const deleteSalesOrder = useCallback((orderId) => attempt(async () => {
    const order = salesOrders.find((o) => o.id === orderId);
    const { stockRestored } = await orderService.deleteSalesOrder(orderId);
    setSalesOrders((prev) => prev.filter((o) => o.id !== orderId));
    if (stockRestored) await refreshStock();
    showToast('success', `Order ${order?.orderNumber || ''} deleted${stockRestored ? ' — stock restored' : ''}`);
    return { success: true };
  }, 'Could not delete order'), [attempt, salesOrders, refreshStock, showToast]);

  /* --------------------------- Computed values ------------------------- */
  const stockValue = products.reduce((sum, p) => sum + getProductTotalStock(p) * p.price, 0);
  const lowStockItems = products.filter((p) => {
    const total = getProductTotalStock(p);
    return total > 0 && total <= p.reorderLevel;
  });
  const outOfStockItems = products.filter((p) => getProductTotalStock(p) === 0);
  const pendingOrders = salesOrders.filter((o) => o.status === 'Pending');

  const value = {
    products, warehouses, movements, suppliers, purchaseOrders, salesOrders, loading, error,
    loadAll, refreshStock, setToastFn, setNotifyFn,
    getProductTotalStock, getProductStockAt,
    stockIn, stockOut, transferStock, reportDamaged,
    addProduct, updateProduct, deleteProduct,
    addWarehouse, updateWarehouse, deleteWarehouse, addLocation,
    addSupplier, updateSupplier, deleteSupplier,
    markPOReceived, addPurchaseOrder, cancelPurchaseOrder, deletePurchaseOrder,
    confirmSalesOrder, updateSalesOrderStatus,
    addSalesOrder, updateSalesOrder, deleteSalesOrder, cancelSalesOrder, returnSalesOrder,
    stockValue, lowStockItems, outOfStockItems, pendingOrders,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
}
