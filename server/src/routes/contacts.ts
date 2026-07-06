import { Router } from 'express';
import { asyncWrapper } from '../middleware/asyncWrapper';
import {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
} from '../controllers/contactsController';

const router = Router();

router.get('/', asyncWrapper(listContacts));
router.post('/', asyncWrapper(createContact));
router.patch('/:id', asyncWrapper(updateContact));
router.delete('/:id', asyncWrapper(deleteContact));

export default router;
