import { productService } from '../services/productService.js';
import { wrap } from '../utils/http.js';

export const listProducts = wrap(async (req, res) => res.json(await productService.list(req.query)));
export const getCategories = wrap(async (_req, res) => res.json(await productService.categories()));
export const getProduct = wrap(async (req, res) => res.json(await productService.get(req.params.id)));
export const createProduct = wrap(async (req, res) => res.status(201).json(await productService.create(req.body || {})));
export const updateProduct = wrap(async (req, res) => res.json(await productService.update(req.params.id, req.body || {})));
export const deleteProduct = wrap(async (req, res) => {
  await productService.remove(req.params.id);
  res.json({ success: true });
});
