import mongoose from "mongoose";
import { generateResponse } from "../../lib/responseFormate.js";
import { getMyResourceQuestionsService, getQuestionsByResourceService, postQuestionService, replyToQuestionService } from "./qa.service.js";


export const postQuestionController = async (req, res) => {
  try {
    const resourceId = req.params.resourceId;

    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return generateResponse(res, 400, false, "Invalid resource ID", null);
    }

    const result = await postQuestionService(resourceId, req.body.question, req.user?._id);
    generateResponse(res, 201, true, "Question posted successfully", result);
  } catch (error) {
    generateResponse(res, 500, false, error.message, null);
  }
};


export const getQuestionsByResourceController = async (req, res) => {
  try {
    const result = await getQuestionsByResourceService(req.params.resourceId);
    generateResponse(res, 200, true, "Questions fetched successfully", result);
  } catch (error) {
    generateResponse(res, 500, false, error.message, null);
  }
};


export const getMyResourceQuestionsController = async (req, res) => {
  try {
    const result = await getMyResourceQuestionsService(req.user._id);
    generateResponse(res, 200, true, "Questions fetched successfully", result);
  } catch (error) {
    generateResponse(res, 500, false, error.message, null);
  }
};


export const replyToQuestionController = async (req, res) => {
  try {
    const { answer } = req.body;
    const result = await replyToQuestionService(req.params.questionId, answer, req.user._id);
    generateResponse(res, 200, true, "Replied successfully", result);
  } catch (error) {
    generateResponse(res, 500, false, error.message, null);
  }
};
