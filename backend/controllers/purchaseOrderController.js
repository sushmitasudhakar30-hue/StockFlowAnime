import { purchaseOrderService as svc } from '../services/purchaseOrderService.js';
import { wrap } from '../utils/http.js';

export const listPurchaseOrders = wrap(async (req, res) => res.json(await svc.list(req.query)));
export const getPurchaseOrder = wrap(async (req, res) => res.json(await svc.get(req.params.id)));
export const createPurchaseOrder = wrap(async (req, res) => res.status(201).json(await svc.create(req.body || {})));
export const updatePurchaseOrder = wrap(async (req, res) => res.json(await svc.update(req.params.id, req.body || {})));
export const receivePurchaseOrder = wrap(async (req, res) =>
  res.json(await svc.receive(req.params.id, req.user, req.body?.warehouseId))
);
export const cancelPurchaseOrder = wrap(async (req, res) => res.json(await svc.cancel(req.params.id)));
export const deletePurchaseOrder = wrap(async (req, res) => {
  await svc.remove(req.params.id);
  res.json({ success: true });
});
