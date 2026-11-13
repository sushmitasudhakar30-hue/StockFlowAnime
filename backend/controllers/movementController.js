import { movementService } from '../services/movementService.js';
import { wrap } from '../utils/http.js';

export const listMovements = wrap(async (req, res) => res.json(await movementService.list(req.query)));
export const getMovement = wrap(async (req, res) => res.json(await movementService.get(req.params.id)));
export const createMovement = wrap(async (req, res) =>
  res.status(201).json(await movementService.create(req.body || {}, req.user))
);
