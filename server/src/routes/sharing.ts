import { Router } from 'express';
import { asyncWrapper } from '../middleware/asyncWrapper';
import { requireAuth } from '../middleware/requireAuth';
import {
  listSharing,
  createSharing,
  getSharing,
  updateSharing,
  deactivateSharing,
  reactivateSharing,
  getSharingByCode,
} from '../controllers/sharingController';

const router = Router();

// Public: recipients open a share by its access code (no login).
router.get('/access/:code', asyncWrapper(getSharingByCode));

// Everything else is owner-scoped and requires a logged-in session.
router.get('/', requireAuth, asyncWrapper(listSharing));
router.post('/', requireAuth, asyncWrapper(createSharing));
router.get('/:id', requireAuth, asyncWrapper(getSharing));
router.patch('/:id', requireAuth, asyncWrapper(updateSharing));
router.post('/:id/deactivate', requireAuth, asyncWrapper(deactivateSharing));
router.post('/:id/reactivate', requireAuth, asyncWrapper(reactivateSharing));

export default router;
