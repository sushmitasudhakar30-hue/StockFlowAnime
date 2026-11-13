import mongoose from 'mongoose';

/** One line of a sales order / purchase order. Stored inside the order document (no separate collection). */
export const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    price: { type: Number, required: true, min: 0 }, // unit price at the time of the order
  },
  { _id: false }
);
