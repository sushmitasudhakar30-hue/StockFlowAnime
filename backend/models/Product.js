import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/jsonOptions.js';

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, required: [true, 'SKU is required'], trim: true },
    name: { type: String, required: [true, 'Product name is required'], trim: true },
    category: { type: String, required: [true, 'Category is required'], trim: true },
    price: { type: Number, required: [true, 'Price is required'], min: [0, 'Price cannot be negative'] },
    reorderLevel: { type: Number, default: 0, min: [0, 'Reorder level cannot be negative'] },
    // { "<warehouseId>": quantity } — same shape the React app already uses
    warehouseStock: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false, toJSON: toJSONOptions }
);

// SKU must be unique, ignoring upper/lower case ("abc-1" and "ABC-1" are the same SKU)
productSchema.index({ sku: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export default mongoose.model('Product', productSchema);
