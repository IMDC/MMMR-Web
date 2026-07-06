import { Router } from 'express';
import { asyncWrapper } from '../middleware/asyncWrapper';
import {
  analyzeVideo,
  analyzeVideoSetSummary,
  getFrequencyData,
  getLineGraphData,
  reprocessFrequency,
} from '../controllers/analysisController';

const router = Router();

router.post('/chatgpt', asyncWrapper(analyzeVideo));
router.post('/videoset-summary', asyncWrapper(analyzeVideoSetSummary));
router.get('/frequency/:videoSetId', asyncWrapper(getFrequencyData));
router.get('/linegraph/:videoSetId', asyncWrapper(getLineGraphData));
router.post('/reprocess-frequency', asyncWrapper(reprocessFrequency));

export default router;
