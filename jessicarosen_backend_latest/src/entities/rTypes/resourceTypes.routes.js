import express from "express";
import { createResourceType, deleteResourceType, getAllResourceTypes, getResourceTypeById, updateResourceType } from "./resourceTypes.controller.js";
import { adminMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";

const router = express.Router();

// Public 
router.get('/all', getAllResourceTypes);
router.get('/:id', getResourceTypeById);

// Admin protected
router.post('/', verifyToken, adminMiddleware, createResourceType);
router.put('/:id', verifyToken, adminMiddleware, updateResourceType);
router.delete('/:id', verifyToken, adminMiddleware, deleteResourceType);

export default router;

