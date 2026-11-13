# StockFlow backend — modules, MongoDB Compass & Postman guide

## 1. What the backend now covers

| Frontend page | API base path | MongoDB collection(s) |
|---|---|---|
| Login / User Management | `/api/auth`, `/api/users` | `users` |
| Inventory (Products) | `/api/products` | `products` |
| Warehouses, Racks, Bins, Warehouse Inventory | `/api/warehouses` | `warehouses`, `racks`, `bins`, `warehouseinventories` |
| Stock Movement | `/api/stock-movements` | `stockmovements` (+ changes `products.warehouseStock`) |
| Suppliers | `/api/suppliers` | `suppliers` |
| Suppliers → Purchase Orders / History | `/api/purchase-orders` | `purchaseorders` |
| Sales Orders | `/api/sales-orders` | `salesorders` |
| Notification bell | `/api/notifications` | `notifications` |
| Dashboard | `/api/dashboard` | (calculated) |
| Reporting (Stock / Sales / Purchase / Warehouse) | `/api/reports/*` | (calculated) |
| Order numbers (SO-1007, PO-2006 …) | — | `counters` |

Layers (same style as the existing user module): `routes → controllers → services → models`.
All business rules (stock checks, order workflow, role rules) live in `services/`.

### Rules the server enforces
* **Stock is never negative.** Every stock change is one atomic MongoDB `$inc`; a decrease only succeeds if enough stock exists.
* **Multi-item operations roll back.** If item 3 of an order fails, items 1 and 2 are reversed.
* **Sales order workflow:** `Pending → Confirmed → Shipped → Delivered`.
  * *Confirm* deducts stock (and writes "Stock Out" movements). Stock is taken from `warehouseId` in the request body, otherwise the first warehouse by name.
  * *Cancel* (Pending/Confirmed) and *Return* (Delivered) put stock back into the same warehouse. *Delete* puts stock back if it was deducted.
  * Only **Pending** orders can be edited.
* **Purchase order:** `Pending → Received`. *Receive* adds the items to stock (writes "Stock In" movements). A received PO can't be received twice or deleted.
* **Low-stock alerts:** when a Stock Out / Damaged / order-confirm takes a product to or below its reorder level, a notification is created automatically (once per product per day while unread).
* **Roles** (same as the UI): reading is open to every logged-in user; writing is restricted —

| Action | Admin | Warehouse Manager | Inventory Staff | Sales Staff |
|---|:-:|:-:|:-:|:-:|
| Users (all) | ✅ | | | |
| Products / Warehouses / Racks / Bins / Suppliers / Purchase orders — create, edit, delete | ✅ | ✅ | | |
| Stock movements (in / out / transfer / damaged) | ✅ | ✅ | ✅ | |
| Sales orders — create, edit, confirm, ship, deliver, delete | ✅ | ✅ | | ✅ |
| Sales orders — cancel, return | ✅ | ✅ | | |
| Reports: stock + sales | ✅ | ✅ | | ✅ |
| Reports: purchase + warehouse | ✅ | ✅ | | |

The role lists are in one file: `backend/config/roles.js`.

---

## 2. Start everything

```bash
# 1. MongoDB running (see SETUP.md)      2. backend
cd backend
npm install
npm run dev
```
Expected console output on the **first** start:
```
✅ MongoDB connected → database "stockflow" ...
🌱 Added 5 demo users to MongoDB
🌱 Added demo data to MongoDB: 12 products, 3 warehouses, 12 racks, 13 bins, 4 suppliers, 11 sales orders, 5 purchase orders, 25 stock movements, 5 notifications
🚀 API running at http://localhost:5000
```
* Demo data is only added when the collections are empty. Start with an empty database instead: set `SEED_DEMO_DATA=false` in `backend/.env`.
* Reset the demo data (keeps users): `npm run seed:fresh`.

---

## 3. See the data in MongoDB Compass

1. Open **MongoDB Compass** → **New connection**.
2. URI: `mongodb://127.0.0.1:27017` (local) — or your Atlas connection string → **Connect**.
3. Open database **`stockflow`**. You will see one collection per row of the table above.
4. After **every** Postman request that changes data, click the **refresh** icon (⟳) in the collection tab, or press the **Find** button again.

Things worth looking at:

| Collection | What to check |
|---|---|
| `products` | The `warehouseStock` field is `{ "<warehouseId>": quantity }`. Watch the numbers change after a Stock In / Stock Out / order confirm. |
| `stockmovements` | A new row for every stock change: `type`, `productId`, `qty`, `user`, `note` (e.g. `Order confirmed: SO-1007`). |
| `salesorders` | `status` moves Pending → Confirmed → …; `warehouseId` is set when confirmed; `items[]` holds product, qty and price. |
| `purchaseorders` | `status: "Received"` plus `receivedAt` after you receive one. |
| `notifications` | New "Low Stock" rows appear when stock drops to the reorder level. |
| `counters` | `salesOrder` / `purchaseOrder` — the last number used. |
| `users` | Passwords are stored as bcrypt hashes. |

Handy Compass filters (type in the **Filter** box):
```
{ status: "Pending" }                      // in salesorders
{ type: "Stock Out" }                      // in stockmovements
{ sku: "ELEC-001" }                        // in products
```

---

## 4. Test the API in Postman

### 4.1 Import
1. Postman → **Import** → choose `postman/StockFlow.postman_collection.json` (116 ready-made requests, bodies filled in).
2. Open the collection → **Variables** tab. `baseUrl` is `http://localhost:5000/api` — change it only if you changed `PORT`.
3. Make sure the backend is running (`GET {{baseUrl}}/health` → `{ "ok": true }`).

### 4.2 Run order (important)
1. **Folder "1. Auth"** → run it first (right-click folder → *Run folder*, or send each request). It logs in as all four demo roles and saves the tokens into variables (`token` = Admin, plus `managerToken`, `staffToken`, `salesToken`). Every other request sends `Authorization: Bearer {{token}}` automatically.
2. Then go **top to bottom through folders 3 → 10**. Early requests (list products, list warehouses, list suppliers) save IDs like `{{productId}}` and `{{warehouseId}}` that later requests use. Create-requests save new IDs (`{{newProductId}}`, `{{salesOrderId}}` …).
3. Each request has automatic tests — look at the **Test Results** tab (green = pass). The whole collection can be run with **Run collection**. Run `npm run seed:fresh` first so every run starts from the same data.

> Re-running the whole collection on the same database is fine; a few "create" requests use fixed names/SKUs, so run **`npm run seed:fresh`** first if you see an unexpected `409 already exists`.

### 4.3 A walkthrough to see everything connect (Postman + Compass side by side)
1. **Login — Admin** → copy nothing; the token is saved.
2. **List products** → note the first product's `totalStock`. In Compass open `products` and find the same SKU.
3. **Stock In (+50)** → expect `201` with `movement`, `product`. Compass: `products.warehouseStock` went up by 50, and `stockmovements` has a new `Stock In` row.
4. **Create order (Sales Staff)** → `201`, `orderNumber` like `SO-1007`. Compass `salesorders`: `status: "Pending"`, stock unchanged.
5. **Confirm → stock deducted** → `status: "Confirmed"`. Compass: product stock decreased, new `Stock Out` movement `Order confirmed: SO-1007`.
6. **Ship**, then **Deliver** → status changes in `salesorders`.
7. **Return (Manager)** → stock comes back, a `Stock In` movement `Order returned: SO-1007` is written.
8. **Mark as Received** (Purchase Orders folder) → stock goes up, PO `status: "Received"`.
9. **Dashboard** / **Reports** → numbers reflect everything you just did.

### 4.4 Building a request by hand (if you don't use the collection)
Headers: `Content-Type: application/json` and, after login, `Authorization: Bearer <token>`.

**Login** — `POST /api/auth/login`
```json
{ "email": "admin@stockflow.in", "password": "admin123" }
```
**Create product** — `POST /api/products`
```json
{ "sku": "TEST-001", "name": "Test Product", "category": "Testing", "price": 100, "reorderLevel": 10 }
```
**Stock In / Out / Damaged** — `POST /api/stock-movements`
```json
{ "type": "Stock In", "productId": "<id>", "warehouseId": "<id>", "qty": 50, "note": "Supplier delivery" }
```
**Transfer** — same URL
```json
{ "type": "Transfer", "productId": "<id>", "fromWarehouseId": "<id>", "toWarehouseId": "<id>", "qty": 5, "note": "Rebalancing" }
```
**Create sales order** — `POST /api/sales-orders` (`price` is optional — the product's price is used)
```json
{ "customer": "Acme Traders", "date": "2026-10-28", "items": [ { "productId": "<id>", "qty": 3 } ] }
```
**Confirm** — `POST /api/sales-orders/<id>/confirm` body `{ "warehouseId": "<id>" }` (body optional)

**Create purchase order** — `POST /api/purchase-orders`
```json
{ "supplierId": "<id>", "items": [ { "productId": "<id>", "qty": 20, "price": 95 } ] }
```
**Receive** — `POST /api/purchase-orders/<id>/receive` body `{ "warehouseId": "<id>" }` (optional)

### 4.5 Status codes you should see
| Code | Meaning in this API |
|---|---|
| 200 / 201 | OK / created |
| 400 | Validation problem or rule broken (bad quantity, insufficient stock, editing a non-pending order, invalid id in URL…). The `message` says what. |
| 401 | No token, bad token, expired token (8 h), or user deactivated |
| 403 | Logged in, but the role isn't allowed |
| 404 | Id doesn't exist / unknown route |
| 409 | Duplicate (SKU, warehouse name, rack/bin name, email) or supplier still has purchase orders |

Errors always look like `{ "message": "…" }`.

---

## 5. Endpoint reference

Query parameters are all optional. `:id` values are MongoDB ids.

**Auth / Users** — `POST /auth/login` · `GET /auth/me` · `GET|POST /users` · `PUT|DELETE /users/:id` · `PATCH /users/:id/toggle`

**Products** — `GET /products` (`?search=&category=&status=in-stock|low-stock|out-of-stock`) · `GET /products/categories` · `GET /products/:id` · `POST /products` · `PUT /products/:id` · `DELETE /products/:id`

**Warehouses** — `GET|POST /warehouses` · `GET|PUT|DELETE /warehouses/:id`
`POST /warehouses/:id/locations` · `DELETE /warehouses/:id/locations/:locationId`
`GET|POST /warehouses/:id/racks` · `DELETE /warehouses/:id/racks/:rackId`
`GET /warehouses/:id/bins` (`?rackId=`) · `GET|POST /warehouses/:id/racks/:rackId/bins` · `DELETE /warehouses/:id/bins/:binId`
`GET|POST /warehouses/:id/inventory` · `DELETE /warehouses/:id/inventory/:itemId`

**Stock movements** — `GET /stock-movements` (`?type=&productId=&warehouseId=&from=&to=&limit=`) · `GET /stock-movements/:id` · `POST /stock-movements`

**Suppliers** — `GET /suppliers` (`?search=`) · `GET /suppliers/:id` · `POST` · `PUT /:id` · `DELETE /:id`

**Purchase orders** — `GET /purchase-orders` (`?status=&supplierId=&from=&to=`) · `GET /:id` · `POST` · `PUT /:id` · `POST /:id/receive` · `POST /:id/cancel` · `DELETE /:id` (Pending or Cancelled only)

**Sales orders** — `GET /sales-orders` (`?status=&from=&to=&customer=&search=`) · `GET /:id` · `POST` · `PUT /:id` · `POST /:id/confirm|ship|deliver|cancel|return` · `DELETE /:id`

**Notifications** — `GET /notifications` (`?unread=true`) · `GET /notifications/unread-count` · `POST` · `PATCH /:id/read` · `PATCH /read-all` · `DELETE /:id`

**Reports** — `GET /reports/stock` (`?warehouseId=&category=&status=&from=&to=`) · `GET /reports/sales` (`?from=&to=&status=`) · `GET /reports/purchase` (`?from=&to=&supplierId=&status=`) · `GET /reports/warehouse` (`?from=&to=`) · `GET /dashboard` (`?days=7|30|90`)

Dates are `YYYY-MM-DD`.

---

## 6. Troubleshooting
| Problem | Fix |
|---|---|
| `Could not start the server` / `ECONNREFUSED` | MongoDB isn't running, or `MONGODB_URI` in `backend/.env` is wrong. |
| Compass shows no `products` etc. | Server started with `SEED_DEMO_DATA=false`, or the database already had products/warehouses. Run `npm run seed:fresh`. Also check you opened database **`stockflow`** and clicked refresh. |
| Postman `401` on everything | Run "1. Auth" again (token expires after 8 hours), or the collection's Authorization tab isn't "Bearer {{token}}". |
| `{{productId}}` shows up literally in the URL | The "List products" request wasn't run yet — run it, or set the variable by hand. |
| `403 You do not have permission` | That request is meant for another role — see the table in section 1. |
| `409 SKU … already exists` when re-running | `npm run seed:fresh`, or delete the leftover `TEST-001` product in Compass. |
| Atlas: `bad auth` / timeout | Wrong password in the URI, or your IP isn't allowed under Network Access. |

## 7. Not done yet: connecting the React pages
The React app's `src/services/*.js` (products, warehouses, orders, suppliers, notifications) still read/write the browser's localStorage — only users/login use this backend so far. The API above returns the same shapes the pages already use (`id`, `warehouseStock`, `items[]`, …), so switching a service to `fetch` is a small change per file — except stock logic: `InventoryContext` currently calculates stock changes in the browser, and those functions should call the stock-movement / order-action endpoints instead so the server stays the single source of truth.
