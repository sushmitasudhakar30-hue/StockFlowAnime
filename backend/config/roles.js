/**
 * Who may WRITE what. Mirrors the role rules in the React app (src/context/AuthContext.jsx + page checks).
 * Reading (GET) is allowed for every logged-in user because the dashboard and the app's global data loader
 * need products / warehouses / orders for all roles. Tighten the GET routes here if you need stricter rules.
 */
export const ADMIN_MANAGER = ['Admin', 'Warehouse Manager'];
export const STOCK_STAFF = ['Admin', 'Warehouse Manager', 'Inventory Staff'];
export const SALES_TEAM = ['Admin', 'Warehouse Manager', 'Sales Staff'];
