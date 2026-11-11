import express from 'express';
import { createServiceController, getAllServicesController, getServiceByCategoryIdController, getServiceByIdController } from './createServices.controller.js';


const router = express.Router();

router.post('/create', createServiceController);
router.get('/get', getAllServicesController);
router.get('/:id', getServiceByIdController);
router.get('/category/:categoryId', getServiceByCategoryIdController);

export default router;
