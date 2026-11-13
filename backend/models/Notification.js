import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/jsonOptions.js';

// Alerts for the notification bell (low stock, new orders, transfers …). Shared by all users.
const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, required: [true, 'Type is required'], trim: true }, // low_stock | order_status | transfer | …
    title: { type: String, required: [true, 'Title is required'], trim: true },
    message: { type: String, default: '', trim: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    read: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

export default mongoose.model('Notification', notificationSchema);
