/**
 * Shared toJSON options: send "id" (what the React app expects) instead of "_id",
 * hide "__v". Used by every model so all API responses look the same.
 */
export const toJSONOptions = {
  versionKey: false,
  transform: (_doc, ret) => {
    if (ret._id !== undefined) {
      ret.id = String(ret._id);
      delete ret._id;
    }
    delete ret.__v;
    return ret;
  },
};
