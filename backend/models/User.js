import mongoose from 'mongoose';

export const ROLES = ['Admin', 'Warehouse Manager', 'Inventory Staff', 'Sales Staff'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    // select:false → the password hash is never returned unless we ask for it
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'Inventory Staff' },
    active: { type: Boolean, default: true },
    avatar: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      // Send "id" (what the React app expects) instead of "_id", and hide internals
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

export default mongoose.model('User', userSchema);
