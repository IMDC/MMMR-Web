import { Router } from 'express';
import { upload } from '../config/multer';
import { asyncWrapper } from '../middleware/asyncWrapper';
import {
  listVideos,
  getVideo,
  uploadVideo,
  updateVideo,
  deleteVideo,
  streamVideoFile,
  transcribeVideoById,
  transcriptionStatus,
} from '../controllers/videosController';

const router = Router();

router.get('/', asyncWrapper(listVideos));
router.post('/upload', upload.single('video'), asyncWrapper(uploadVideo));
router.get('/stream/:filename', asyncWrapper(streamVideoFile));   // must be before /:id
router.get('/:id', asyncWrapper(getVideo));
router.patch('/:id', asyncWrapper(updateVideo));
router.delete('/:id', asyncWrapper(deleteVideo));
router.post('/:id/transcribe', asyncWrapper(transcribeVideoById));
router.get('/:id/transcription-status', asyncWrapper(transcriptionStatus));

export default router;
