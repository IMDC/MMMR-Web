import { Router } from 'express';
import { asyncWrapper } from '../middleware/asyncWrapper';
import {
  listVideoSets,
  createVideoSet,
  getVideoSet,
  updateVideoSet,
  deleteVideoSet,
  addVideosToSet,
  removeVideoFromSet,
} from '../controllers/videoSetsController';

const router = Router();

router.get('/', asyncWrapper(listVideoSets));
router.post('/', asyncWrapper(createVideoSet));
router.get('/:id', asyncWrapper(getVideoSet));
router.patch('/:id', asyncWrapper(updateVideoSet));
router.delete('/:id', asyncWrapper(deleteVideoSet));
router.post('/:id/videos', asyncWrapper(addVideosToSet));
router.delete('/:id/videos/:videoId', asyncWrapper(removeVideoFromSet));

export default router;
