import { Router } from 'express';
import { asyncWrapper } from '../middleware/asyncWrapper';
import { loginRateLimit } from '../middleware/loginRateLimit';
import { login, logout, me, updatePreferences, changePassword } from '../controllers/authController';

const router = Router();

router.post('/login', loginRateLimit, asyncWrapper(login));
router.post('/logout', asyncWrapper(logout));
router.get('/me', asyncWrapper(me));
router.patch('/preferences', asyncWrapper(updatePreferences));
router.post('/change-password', asyncWrapper(changePassword));

export default router;
