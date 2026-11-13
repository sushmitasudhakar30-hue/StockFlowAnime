import mongoose from 'mongoose';

// One document per sequence, e.g. { _id: 'salesOrder', seq: 1006 }
const counterSchema = new mongoose.Schema(
  { _id: { type: String }, seq: { type: Number, default: 0 } },
  { versionKey: false }
);

export default mongoose.model('Counter', counterSchema);
