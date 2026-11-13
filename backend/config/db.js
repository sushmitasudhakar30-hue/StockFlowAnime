import mongoose from 'mongoose';

/** Connects to MongoDB using MONGODB_URI from backend/.env */
export default async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing in backend/.env');

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log(`✅ MongoDB connected → database "${mongoose.connection.name}" on ${mongoose.connection.host}`);
}
