import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/jsonOptions.js';
import { orderItemSchema } from './orderItem.js';

export const SALES_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];

const salesOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true }, // SO-1001 …
    customer: { type: String, required: [true, 'Customer name is required'], trim: true },
    date: { type: String, required: true }, // "YYYY-MM-DD" (kept as text, same as the React app)
    status: { type: String, enum: SALES_STATUSES, default: 'Pending' },
    items: { type: [orderItemSchema], validate: [(v) => v.length > 0, 'An order needs at least one item'] },
    total: { type: Number, required: true, min: 0 },
    // The warehouse stock was deducted from when the order was confirmed (so cancel/return puts it back there)
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

salesOrderSchema.index({ date: -1 });

export default mongoose.model('SalesOrder', salesOrderSchema);
