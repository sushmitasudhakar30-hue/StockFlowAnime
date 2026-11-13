# Run locally
```bash
npm install
npm run server:install
cp backend/.env.example backend/.env      # then edit MONGODB_URI and set a long random JWT_SECRET
npm run server        # terminal 1 → http://localhost:5000
npm run dev           # terminal 2 → http://localhost:5173
```

# Deploy on Vercel (two projects, one repo)
You need a cloud database: create a free **MongoDB Atlas** cluster and copy its connection string
(Atlas → Network Access → allow `0.0.0.0/0`, since Vercel IPs change).

**1. Backend** — Vercel → Add New Project → same repo → **Root Directory: `backend`** → Framework: Other.
Environment variables:
`MONGODB_URI`, `JWT_SECRET` (long random text), `CLIENT_URL` (your frontend URL, set after step 2), `SEED_DEMO_DATA=true`.
Deploy, then open `https://<backend>.vercel.app/api/health` → should show `{"ok":true}`.

**2. Frontend** — Add New Project → same repo → Root Directory: repo root → Framework: Vite.
Environment variable: `VITE_API_URL=https://<backend>.vercel.app/api`

**3.** Put the frontend URL into the backend's `CLIENT_URL` (comma-separate several) and redeploy the backend.
