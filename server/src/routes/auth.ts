import { Router } from 'express';
import { asyncWrapper } from '../middleware/asyncWrapper';
import { login, logout, me } from '../controllers/authController';

const router = Router();

router.post('/login', asyncWrapper(login));
router.post('/logout', asyncWrapper(logout));
router.get('/me', asyncWrapper(me));

export default router;
