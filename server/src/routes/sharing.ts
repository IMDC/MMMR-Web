import { Router } from 'express';
import { asyncWrapper } from '../middleware/asyncWrapper';
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

router.get('/', asyncWrapper(listSharing));
router.post('/', asyncWrapper(createSharing));
router.get('/access/:code', asyncWrapper(getSharingByCode));
router.get('/:id', asyncWrapper(getSharing));
router.patch('/:id', asyncWrapper(updateSharing));
router.post('/:id/deactivate', asyncWrapper(deactivateSharing));
router.post('/:id/reactivate', asyncWrapper(reactivateSharing));

export default router;
