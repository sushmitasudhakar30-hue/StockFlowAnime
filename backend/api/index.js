/* Vercel serverless entry — wraps the Express app. DB connect + seed run once per warm instance. */
import app from '../app.js';
import connectDB from '../config/db.js';
import { seedUsersIfEmpty, seedDemoDataIfEmpty } from '../seed.js';

let ready = null;
const init = () => {
  if (!ready) {
    ready = (async () => {
      if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
      await connectDB();
      await seedUsersIfEmpty();
      if (process.env.SEED_DEMO_DATA !== 'false') await seedDemoDataIfEmpty();
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
};

export default async function handler(req, res) {
  try {
    await init();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server is not configured: ' + e.message });
  }
  return app(req, res);
}
