import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/jsonOptions.js';

const rackSchema = new mongoose.Schema(
  {
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    name: { type: String, required: [true, 'Rack name is required'], trim: true },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

export default mongoose.model('Rack', rackSchema);
