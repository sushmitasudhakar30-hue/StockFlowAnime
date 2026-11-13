import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/jsonOptions.js';

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Supplier name is required'], trim: true },
    contactPerson: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    phone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

export default mongoose.model('Supplier', supplierSchema);
