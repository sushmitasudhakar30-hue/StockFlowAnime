import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/jsonOptions.js';

export const MOVEMENT_TYPES = ['Stock In', 'Stock Out', 'Transfer', 'Damaged'];
const ref = (to) => ({ type: mongoose.Schema.Types.ObjectId, ref: to, default: null });

// Append-only log: every stock change (manual or caused by an order/PO) leaves a row here.
const stockMovementSchema = new mongoose.Schema(
  {
    type: { type: String, enum: MOVEMENT_TYPES, required: true },
    productId: ref('Product'), // becomes null if the product is deleted (history is kept)
    warehouseId: ref('Warehouse'),
    fromWarehouseId: ref('Warehouse'),
    toWarehouseId: ref('Warehouse'),
    qty: { type: Number, required: true, min: [1, 'Quantity must be positive'] },
    date: { type: Date, default: Date.now },
    user: { type: String, default: '' }, // name of the person who did it
    note: { type: String, default: '' },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

stockMovementSchema.index({ date: -1 });

export default mongoose.model('StockMovement', stockMovementSchema);
