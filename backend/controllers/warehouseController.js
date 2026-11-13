import { warehouseService as svc } from '../services/warehouseService.js';
import { wrap } from '../utils/http.js';

const ok = (res, data) => res.json(data);
const created = (res, data) => res.status(201).json(data);
const done = (res) => res.json({ success: true });

// warehouses
export const listWarehouses = wrap(async (_req, res) => ok(res, await svc.list()));
export const getWarehouse = wrap(async (req, res) => ok(res, await svc.get(req.params.id)));
export const createWarehouse = wrap(async (req, res) => created(res, await svc.create(req.body || {})));
export const updateWarehouse = wrap(async (req, res) => ok(res, await svc.update(req.params.id, req.body || {})));
export const deleteWarehouse = wrap(async (req, res) => { await svc.remove(req.params.id); done(res); });

// locations
export const addLocation = wrap(async (req, res) => created(res, await svc.addLocation(req.params.id, req.body || {})));
export const deleteLocation = wrap(async (req, res) => ok(res, await svc.removeLocation(req.params.id, req.params.locationId)));

// racks
export const listRacks = wrap(async (req, res) => ok(res, await svc.listRacks(req.params.id)));
export const addRack = wrap(async (req, res) => created(res, await svc.addRack(req.params.id, req.body || {})));
export const deleteRack = wrap(async (req, res) => { await svc.removeRack(req.params.id, req.params.rackId); done(res); });

// bins
export const listBins = wrap(async (req, res) => ok(res, await svc.listBins(req.params.id, req.query.rackId)));
export const listRackBins = wrap(async (req, res) => ok(res, await svc.listBins(req.params.id, req.params.rackId)));
export const addBin = wrap(async (req, res) => created(res, await svc.addBin(req.params.id, req.params.rackId, req.body || {})));
export const deleteBin = wrap(async (req, res) => { await svc.removeBin(req.params.id, req.params.binId); done(res); });

// warehouse inventory
export const listInventory = wrap(async (req, res) => ok(res, await svc.listInventory(req.params.id)));
export const addInventory = wrap(async (req, res) => created(res, await svc.addInventory(req.params.id, req.body || {})));
export const deleteInventory = wrap(async (req, res) => { await svc.removeInventory(req.params.id, req.params.itemId); done(res); });
