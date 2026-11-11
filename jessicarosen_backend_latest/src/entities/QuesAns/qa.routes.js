import express from "express";
import { adminSellerMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";
import { getMyResourceQuestionsController, getQuestionsByResourceController, postQuestionController, replyToQuestionController } from "./qa.controller.js";


const router = express.Router();

// post question
router.post("/:resourceId", verifyToken, postQuestionController);

// view all question and answers
router.get("/:resourceId", getQuestionsByResourceController);

// Seller/admin view
router.get("/", verifyToken, adminSellerMiddleware, getMyResourceQuestionsController);

// Seller/Admin can reply to a question
router.post("/reply/:questionId", verifyToken, adminSellerMiddleware, replyToQuestionController);

export default router;
