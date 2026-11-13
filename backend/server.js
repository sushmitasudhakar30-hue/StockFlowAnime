import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import { seedUsersIfEmpty, seedDemoDataIfEmpty } from './seed.js';

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is missing in backend/.env');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

try {
  await connectDB();
  await seedUsersIfEmpty();
  if (process.env.SEED_DEMO_DATA !== 'false') await seedDemoDataIfEmpty();
  app.listen(PORT, () => console.log(`🚀 API running at http://localhost:${PORT}`));
} catch (err) {
  console.error('\n❌ Could not start the server:', err.message);
  console.error('   → Is MongoDB running? Check MONGODB_URI in backend/.env\n');
  process.exit(1);
}
