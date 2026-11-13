import { Router } from 'express';
import * as c from '../controllers/warehouseController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateParams } from '../middleware/validateId.js';
import { ADMIN_MANAGER } from '../config/roles.js';

const router = Router();
validateParams(router, 'id', 'locationId', 'rackId', 'binId', 'itemId');
router.use(requireAuth);

const manage = requireRole(...ADMIN_MANAGER);

// warehouses
router.get('/', c.listWarehouses);
router.post('/', manage, c.createWarehouse);
router.get('/:id', c.getWarehouse);
router.put('/:id', manage, c.updateWarehouse);
router.delete('/:id', manage, c.deleteWarehouse);

// rack/bin "locations" shown on the warehouse card
router.post('/:id/locations', manage, c.addLocation);
router.delete('/:id/locations/:locationId', manage, c.deleteLocation);

// racks
router.get('/:id/racks', c.listRacks);
router.post('/:id/racks', manage, c.addRack);
router.delete('/:id/racks/:rackId', manage, c.deleteRack);

// bins
router.get('/:id/bins', c.listBins); // optional ?rackId=
router.get('/:id/racks/:rackId/bins', c.listRackBins);
router.post('/:id/racks/:rackId/bins', manage, c.addBin);
router.delete('/:id/bins/:binId', manage, c.deleteBin);

// warehouse inventory (stock placed in racks/bins)
router.get('/:id/inventory', c.listInventory);
router.post('/:id/inventory', manage, c.addInventory);
router.delete('/:id/inventory/:itemId', manage, c.deleteInventory);

export default router;
