import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/jsonOptions.js';

// "Stock placed in rack X / bin Y of warehouse Z" (what the Warehouse Inventory page shows)
const warehouseInventorySchema = new mongoose.Schema(
  {
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, default: '' }, // copied from the product when the entry is created
    sku: { type: String, default: '' },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be positive'] },
    rackId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rack', required: true },
    rack: { type: String, default: '' },
    binId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bin', required: true },
    bin: { type: String, default: '' },
  },
  { timestamps: true, collection: 'warehouseinventories', toJSON: toJSONOptions }
);

export default mongoose.model('WarehouseInventory', warehouseInventorySchema);
