import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/jsonOptions.js';

// Legacy "location" rows shown on the warehouse card: rack + bin + product + quantity
const locationSchema = new mongoose.Schema(
  {
    rack: { type: String, required: [true, 'Rack is required'], trim: true },
    bin: { type: String, required: [true, 'Bin is required'], trim: true },
    productSku: { type: String, default: '', trim: true },
    quantity: { type: Number, default: 0, min: 0 },
  },
  { toJSON: toJSONOptions }
);

const warehouseSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Warehouse name is required'], trim: true },
    location: { type: String, required: [true, 'Location is required'], trim: true },
    capacity: { type: Number, required: [true, 'Capacity is required'], min: [1, 'Capacity must be at least 1'] },
    locations: { type: [locationSchema], default: [] },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

warehouseSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export default mongoose.model('Warehouse', warehouseSchema);
