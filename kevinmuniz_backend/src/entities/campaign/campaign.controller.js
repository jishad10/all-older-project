import { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";
import { createPaginationInfo } from "../../lib/pagination.js";
import { generateResponse } from "../../lib/responseFormate.js";
import * as campaignService from "./campaign.service.js";


export const createCampaign = async (req, res) => {
  try {
    const {
      title,
      shortDescription,
      category,
      location,
      proposedFunding,
      creatingDate,
      endDate,
      campaignDetails
    } = req.body;

    const file = req.files?.image?.[0];

    if (!file) {
      return generateResponse(res, 400, false, "Campaign image is required");
    }

    const upload = await cloudinaryUpload(
      file.path,
      `campaign_${Date.now()}`,
      "campaign/images"
    );

    const campaign = await campaignService.createCampaignService({
      title,
      shortDescription,
      category,
      location,
      proposedFunding,
      creatingDate,
      endDate,
      campaignDetails,
      image: upload.secure_url,
      createdBy: req.user.id
    });

    generateResponse(res, 201, true, "Campaign submitted for approval", campaign);

  } catch (error) {
    generateResponse(res, 400, false, error.message);
  }
};


export const getAllCampaigns = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      approvalStatus,
      activeStatus,
      search
    } = req.query;

    page  = parseInt(page);
    limit = parseInt(limit);

    const result = await campaignService.getAllCampaignsService({
      page,
      limit,
      approvalStatus,
      activeStatus,
      search,
      user: req.user || null
    });

    const pagination = createPaginationInfo(page, limit, result.totalData);

    generateResponse(res, 200, true, "Campaigns fetched successfully", {
      data: result.campaigns,
      pagination
    });
  } catch (error) {
    generateResponse(res, 500, false, error.message);
  }
};



export const updateCampaignStatus = async (req, res) => {
  try {
    const { approvalStatus, activeStatus } = req.body;

    const campaign = await campaignService.updateCampaignStatusService(
      req.params.id,
      { approvalStatus, activeStatus }
    );

    generateResponse(res, 200, true, "Campaign status updated successfully", campaign);

  } catch (error) {
    generateResponse(res, 400, false, error.message);
  }
};


export const updateCampaign = async (req, res) => {
  try {
    const {
      title,
      shortDescription,
      category,
      location,
      proposedFunding,
      creatingDate,
      endDate,
      campaignDetails
    } = req.body;

    const file = req.files?.image?.[0];

    const payload = {
      title,
      shortDescription,
      category,
      location,
      proposedFunding,
      creatingDate,
      endDate,
      campaignDetails
    };

    if (file) {
      const upload = await cloudinaryUpload(
        file.path,
        `campaign_${Date.now()}`,
        "campaign/images"
      );
      payload.image = upload.secure_url;
    }

    const campaign = await campaignService.updateCampaignService(
      req.params.id,
      payload,
      req.user
    );

    generateResponse(res, 200, true, "Campaign updated successfully", campaign);
  } catch (error) {
    generateResponse(res, 400, false, error.message);
  }
};


export const getCampaignById = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);

    const data = await campaignService.getCampaignByIdService({
      id: req.params.id,
      user: req.user || null,
      page,
      limit,
    });

    generateResponse(res, 200, true, "Campaign fetched successfully", data);
  } catch (error) {
    generateResponse(res, 404, false, error.message);
  }
};


export const closeCampaign = async (req, res) => {
  try {
    const campaign = await campaignService.closeCampaignService(
      req.params.id,
      req.user._id,
      req.user.role
    );

    generateResponse(res, 200, true, "Campaign closed successfully", campaign);
  } catch (error) {
    const status = error.message === "Campaign not found." ? 404
      : error.message === "Unauthorized to close this campaign." ? 403
      : error.message === "Campaign is already closed." ? 400
      : 400;
    generateResponse(res, status, false, error.message);
  }
};


export const deleteCampaign = async (req, res) => {
  try {
    await campaignService.deleteCampaignService(
      req.params.id,
      req.user._id,
      req.user.role
    );

    generateResponse(res, 200, true, "Campaign deleted successfully", null);
  } catch (error) {
    const status = error.message === "Campaign not found." ? 404
      : error.message === "Unauthorized to delete this campaign." ? 403
      : 400;
    generateResponse(res, status, false, error.message);
  }
};
