import { getAllCustomContactsController ,getCustomContactByIdController, createCustomContactController, updateCustomContactController, deleteCustomContactController} from './customContactController.js';

import express from 'express';
const router = express.Router();

router.get('/', getAllCustomContactsController);
router.get('/:id', getCustomContactByIdController);
router.post('/', createCustomContactController);
router.put('/:id', updateCustomContactController);
router.delete('/:id', deleteCustomContactController);

export default router;
