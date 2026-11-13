# StockFlow Admin

Smart Inventory & Warehouse Management — React + Vite frontend.

**Data storage:** every module is stored in MongoDB through the Node/Express REST API in `/backend`
(users, products, warehouses/racks/bins, stock movements, suppliers, purchase orders, sales orders, notifications).
The React app talks to the API only through `src/services/*` — there is no localStorage data any more
(only the login token and the theme are kept in the browser).
Dashboard and Reports are calculated in the browser from the data loaded from the API.
API testing guide (MongoDB Compass + Postman): **backend/API_GUIDE.md**, collection: **postman/StockFlow.postman_collection.json** (120 requests, 177 assertions).

See **SETUP.md** for the step-by-step guide.

## Premium UI + motion ("Aurora Ink")

- Dark-first theme with indigo / cyan accents, glass cards and an ambient aurora background — all in `src/premium.css`
  (it loads after `styles.css` and only changes looks; toggle light/dark with the sun/moon button).
- Animations use **Framer Motion**: page transitions, staggered sidebar with a sliding active pill, KPI cards, scroll-reveal
  dashboard cards, modals, toasts, dropdowns and the login screen. Presets live in `src/motion/variants.js`.
- Animations switch off automatically for users who enable "reduce motion" in their operating system.
- After pulling this version run `npm install` once in the project root (adds `framer-motion`).

- **Logo:** new isometric cube + flow-line mark in `src/components/Logo.jsx` (favicon: `public/stockflow-logo.svg`).
- **Next step:** `CLAUDE_PROMPT.md` — ready-made prompt for the 3D / premium UI pass.

## Sales & inventory features (merged in)

- **Sales Orders** – create / edit (pending only) / delete orders, confirm → ship → deliver, cancel and return with
  automatic stock restore, status summary cards, date filters, sorting, pagination, CSV export, order tracker and invoice.
- **Warehouses** – add / edit / view / delete warehouses, rack and bin management, and warehouse inventory entries
  (racks, bins and warehouse inventory entries are stored in MongoDB).

- **Suppliers** (Admin, Warehouse Manager, Sales Staff) – three tabs: *Supplier Management* (search, view, add / edit / delete for Admin & Warehouse Manager),
  *Purchase Orders* (filter, mark received → automatic stock-in) and *Purchase History* (supplier-wise summary, filters, CSV).
- **Reporting** (Admin, Warehouse Manager, Sales Staff) – tabs for Stock and Sales reports (all roles), plus Purchase and Warehouse reports
  (Admin / Warehouse Manager), each with filters, KPI cards, CSV download and Print / PDF.

### Sales Staff access

Dashboard · Inventory · Suppliers · Sales Orders (create / edit pending, confirm → ship → deliver; no cancel/return) · Reporting (Stock + Sales).

## Run

```bash
# 1. Make sure MongoDB is running (see SETUP.md)
# 2. Terminal 1 – backend
cd backend && npm install && npm run dev
# 3. Terminal 2 – frontend (project root)
npm install && npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

### Demo logins

| Role               | Email                  | Password     |
| ------------------ | ---------------------- | ------------ |
| Admin              | admin@stockflow.in     | admin123     |
| Warehouse Manager  | manager@stockflow.in   | manager123   |
| Inventory Staff    | staff@stockflow.in     | staff123     |
| Sales Staff        | sales@stockflow.in     | sales123     |

(The login page also has click-to-autofill chips.)

## Architecture

```
React UI (pages / components)
   ↓
Contexts (AuthContext, InventoryContext, NotificationContext)
   ↓
src/services/*.js  →  api.js (adds the JWT, turns errors into messages)
   ↓  /api  (Vite proxy in dev)
Express routes → controllers → services → Mongoose models → MongoDB
```

| File                                   | Responsibility                                                   |
| -------------------------------------- | ---------------------------------------------------------------- |
| `src/services/api.js`                  | fetch helper: token header, error messages, redirect on 401      |
| `src/services/inventoryService.js`     | Products, warehouses, stock movements                            |
| `src/services/orderService.js`         | Sales orders, purchase orders                                    |
| `src/services/supplierService.js`      | Suppliers                                                        |
| `src/services/userService.js`          | Login, `me`, user management                                     |
| `src/services/notificationService.js`  | Notification bell                                                |
| `src/pages/warehouse/warehouseStore.js`| Racks, bins and warehouse-inventory entries                      |

**Stock is only ever changed by the server** (`POST /stock-movements`, order confirm / cancel / return / delete,
purchase-order receive). Low-stock notifications are created by the server too. The browser re-reads the data afterwards.

### Roles
Admin · Warehouse Manager · Inventory Staff · Sales Staff — enforced on the server (HTTP 403) and in the UI.

### Before going live
- Change `JWT_SECRET` in `backend/.env` (a random one is already set for this build) and never commit `.env`.
- Set `CLIENT_URL` in `backend/.env` to your real site address (comma-separate several).
- Set `SEED_DEMO_DATA=false` and change / delete the demo users.
- The demo-login chips on the login page only show in development (`npm run dev`), not in a production build.
- Build the frontend with `npm run build` and serve `dist/` behind HTTPS; set `VITE_API_URL` if the API is on another domain.
