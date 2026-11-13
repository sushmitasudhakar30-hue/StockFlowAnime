import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/jsonOptions.js';

const binSchema = new mongoose.Schema(
  {
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    rackId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rack', required: true, index: true },
    name: { type: String, required: [true, 'Bin name is required'], trim: true },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

export default mongoose.model('Bin', binSchema);
