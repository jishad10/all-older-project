import express from "express";
import { createPracticeArea, deletePracticeArea, getAllPracticeAreas, getPracticeAreaById, updatePracticeArea } from "./practiceArea.controller.js";
import { adminMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";

const router = express.Router();

// Public 
router.get('/all', getAllPracticeAreas);
router.get('/:id', getPracticeAreaById);

// Admin protected
router.post('/', verifyToken, adminMiddleware, createPracticeArea);
router.put('/:id', verifyToken, adminMiddleware, updatePracticeArea);
router.delete('/:id', verifyToken, adminMiddleware, deletePracticeArea);

export default router;

