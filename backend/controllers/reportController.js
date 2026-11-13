import { reportService } from '../services/reportService.js';
import { wrap } from '../utils/http.js';

export const stockReport = wrap(async (req, res) => res.json(await reportService.stock(req.query)));
export const salesReport = wrap(async (req, res) => res.json(await reportService.sales(req.query)));
export const purchaseReport = wrap(async (req, res) => res.json(await reportService.purchase(req.query)));
export const warehouseReport = wrap(async (req, res) => res.json(await reportService.warehouse(req.query)));
export const dashboard = wrap(async (req, res) => res.json(await reportService.dashboard(req.query)));
