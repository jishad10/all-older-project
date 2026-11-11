import { generateResponse } from "../../lib/responseFormate.js";
import { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";
import * as representationService from "./representation.service.js";


export const createRepresentationController = async (req, res, next) => {
  try {
    const { firstName, lastName, productionCompany, imdbPageLink } = req.body;
    const { campaignId } = req.params;
    const userId = req.user._id;

    // Handle CV file upload
    const cvFile = req.files?.cv?.[0];
    let cvUrl = "";
    if (cvFile) {
      const upload = await cloudinaryUpload(
        cvFile.path,
        `cv_${userId}_${Date.now()}`,
        "representation/cvs"
      );
      cvUrl = upload.secure_url;
    }

    const data = await representationService.createRepresentationService({
      campaignId,
      userId,
      firstName,
      lastName,
      productionCompany,
      imdbPageLink,
      cv: cvUrl,
    });

    return generateResponse(res, 201, true, "Representation submitted successfully", data);
  } catch (error) {
    next(error);
  }
};


export const getAllRepresentationsController = async (req, res, next) => {
  try {
    const { page, limit, status, search } = req.query;

    const data = await representationService.getAllRepresentationsService({
      page,
      limit,
      status,
      search,
    });

    return generateResponse(res, 200, true, "All representations fetched successfully", data);
  } catch (error) {
    next(error);
  }
};


export const getAllRepresentationsByCampaignController = async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const { page, limit, status, search } = req.query;

    const data = await representationService.getAllRepresentationsByCampaignService({
      campaignId,
      page,
      limit,
      status,
      search,
    });

    return generateResponse(res, 200, true, "Representations fetched successfully", data);
  } catch (error) {
    next(error);
  }
};


export const getRepresentationByIdController = async (req, res, next) => {
  try {
    const data = await representationService.getRepresentationByIdService(req.params.id);

    return generateResponse(res, 200, true, "Representation fetched successfully", data);
  } catch (error) {
    next(error);
  }
};


export const getMyRepresentationController = async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user._id;

    const data = await representationService.getMyRepresentationService({ campaignId, userId });

    return generateResponse(res, 200, true, "Your representation fetched successfully", data);
  } catch (error) {
    next(error);
  }
};


// Admin only
export const updateRepresentationController = async (req, res, next) => {
  try {
    const { firstName, lastName, productionCompany, imdbPageLink, status } = req.body;

    // Handle CV file upload if provided
    let cvUrl;
    const cvFile = req.files?.cv?.[0];
    if (cvFile) {
      const upload = await cloudinaryUpload(
        cvFile.path,
        `cv_${req.params.id}_${Date.now()}`,
        "representation/cvs"
      );
      cvUrl = upload.secure_url;
    }

    const data = await representationService.updateRepresentationService({
      id: req.params.id,
      firstName,
      lastName,
      productionCompany,
      imdbPageLink,
      cv: cvUrl,
      status,
    });

    return generateResponse(res, 200, true, "Representation updated successfully", data);
  } catch (error) {
    next(error);
  }
};


export const deleteRepresentationController = async (req, res, next) => {
  try {
    await representationService.deleteRepresentationService({
      id: req.params.id,
      userId: req.user._id,
      userRole: req.user.role,
    });

    return generateResponse(res, 200, true, "Representation deleted successfully", null);
  } catch (error) {
    next(error);
  }
};