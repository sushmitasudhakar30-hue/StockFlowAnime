import { salesOrderService as svc } from '../services/salesOrderService.js';
import { wrap } from '../utils/http.js';

export const listSalesOrders = wrap(async (req, res) => res.json(await svc.list(req.query)));
export const getSalesOrder = wrap(async (req, res) => res.json(await svc.get(req.params.id)));
export const createSalesOrder = wrap(async (req, res) => res.status(201).json(await svc.create(req.body || {})));
export const updateSalesOrder = wrap(async (req, res) => res.json(await svc.update(req.params.id, req.body || {})));
export const confirmSalesOrder = wrap(async (req, res) =>
  res.json(await svc.confirm(req.params.id, req.user, req.body?.warehouseId))
);
export const shipSalesOrder = wrap(async (req, res) => res.json(await svc.ship(req.params.id)));
export const deliverSalesOrder = wrap(async (req, res) => res.json(await svc.deliver(req.params.id)));
export const cancelSalesOrder = wrap(async (req, res) => res.json(await svc.cancel(req.params.id, req.user)));
export const returnSalesOrder = wrap(async (req, res) => res.json(await svc.returnOrder(req.params.id, req.user)));
export const deleteSalesOrder = wrap(async (req, res) => res.json(await svc.remove(req.params.id, req.user)));
