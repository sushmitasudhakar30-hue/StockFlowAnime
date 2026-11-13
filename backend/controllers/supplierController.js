import { supplierService } from '../services/supplierService.js';
import { wrap } from '../utils/http.js';

export const listSuppliers = wrap(async (req, res) => res.json(await supplierService.list(req.query)));
export const getSupplier = wrap(async (req, res) => res.json(await supplierService.get(req.params.id)));
export const createSupplier = wrap(async (req, res) => res.status(201).json(await supplierService.create(req.body || {})));
export const updateSupplier = wrap(async (req, res) => res.json(await supplierService.update(req.params.id, req.body || {})));
export const deleteSupplier = wrap(async (req, res) => {
  await supplierService.remove(req.params.id);
  res.json({ success: true });
});
