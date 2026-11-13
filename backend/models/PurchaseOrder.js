import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/jsonOptions.js';
import { orderItemSchema } from './orderItem.js';

export const PO_STATUSES = ['Pending', 'Received', 'Cancelled'];

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true }, // PO-2001 …
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    status: { type: String, enum: PO_STATUSES, default: 'Pending' },
    items: { type: [orderItemSchema], validate: [(v) => v.length > 0, 'A purchase order needs at least one item'] },
    total: { type: Number, required: true, min: 0 },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null }, // where it was received
    receivedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

purchaseOrderSchema.index({ date: -1 });

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);
