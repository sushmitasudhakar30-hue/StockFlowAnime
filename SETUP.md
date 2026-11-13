# StockFlow – MongoDB + User Management setup

```
React (Vite, :5173 or next free port)  ──/api──▶  Express backend (:5000)  ──▶  MongoDB (:27017, database "stockflow")
```

## 1. Get MongoDB (pick ONE)

### Option A – MongoDB Atlas (cloud, nothing to install) ← easiest
1. Sign up free at https://www.mongodb.com/cloud/atlas/register
2. Create a free **M0** cluster.
3. **Database Access** → Add a database user (username + password, remember them).
4. **Network Access** → Add IP Address → *Allow access from anywhere* (0.0.0.0/0) for development.
5. **Database** → Connect → Drivers → copy the connection string.
6. Put it in `backend/.env` (add `/stockflow` before the `?`):
   `MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/stockflow?retryWrites=true&w=majority`
   (If your password has special characters like `@` or `#`, URL-encode them.)

### Option B – MongoDB on your own computer
1. Download **MongoDB Community Server**: https://www.mongodb.com/try/download/community
2. Windows: run the installer, choose "Complete", keep **"Install MongoDB as a Service"** ticked
   (it then starts automatically). Also tick **MongoDB Compass** (the visual viewer).
   Mac: `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`
   Ubuntu: follow https://www.mongodb.com/docs/manual/administration/install-on-linux/ then `sudo systemctl start mongod`
3. `backend/.env` already contains the right line, nothing to change:
   `MONGODB_URI=mongodb://127.0.0.1:27017/stockflow`

## 2. Start the backend
```bash
cd backend
npm install
npm run dev
```
You should see:
```
✅ MongoDB connected → database "stockflow" ...
🌱 Added 5 demo users to MongoDB      (first run only)
🚀 API running at http://localhost:5000
```

## 3. Start the frontend (new terminal, project root)
```bash
npm install
npm run dev
```
Open http://localhost:5173 and sign in with `admin@stockflow.in` / `admin123`.

## 4. See the users in MongoDB
Open **MongoDB Compass** (or Atlas → Browse Collections) → database `stockflow` → collection `users`.
Add a user in **User Management** and it appears there immediately (passwords are stored hashed).

## API
| Method | URL | Who | What |
|---|---|---|---|
| POST | /api/auth/login | anyone | email + password → token |
| GET | /api/auth/me | logged in | current user |
| GET | /api/users | Admin | list users |
| POST | /api/users | Admin | add user |
| PUT | /api/users/:id | Admin | edit user / change password |
| PATCH | /api/users/:id/toggle | Admin | activate / deactivate |
| DELETE | /api/users/:id | Admin | delete user |

## Troubleshooting
- **"Cannot reach the server"** in the browser → backend isn't running (step 2).
- **"Could not start the server" / connection refused** → MongoDB isn't running, or `MONGODB_URI` is wrong.
- **Atlas: "bad auth" / timeout** → wrong password in the URI, or your IP isn't allowed in Network Access.
- **Old localStorage users** from the earlier version are no longer used; sign in with the demo users above.

## 5. Test every module (Compass + Postman)
The backend now covers all modules, not just users. Demo products, warehouses, orders etc. are added to MongoDB
automatically the first time the server starts (set `SEED_DEMO_DATA=false` in `backend/.env` to skip; `npm run seed:fresh`
resets them). Full API list, Compass tips and the Postman walkthrough: **backend/API_GUIDE.md**.
Import `postman/StockFlow.postman_collection.json` into Postman and run the "1. Auth" folder first.

## 5. Test the API with Postman
Import `postman/StockFlow.postman_collection.json`, run folder **1. Auth** first, then the rest top to bottom
(or *Run collection*). Details: `backend/API_GUIDE.md`.
