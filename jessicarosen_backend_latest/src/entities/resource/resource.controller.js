import {
  createResourceService,
  getAllResourcesService,
  getResourceByIdService,
  updateResourceService,
  deleteResourceService,
  getSellerResourcesService,
  getMostPopularResources,
  getTopSellingResources,
  getSellerProfileResourcesService
} from "./resource.service.js";
import { generateResponse } from "../../lib/responseFormate.js";
import { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";


export const createResource = async (req, res) => {
  try {
    const createdBy = req.user._id;
    const { 
      title, 
      description, 
      discountPrice, 
      quantity, 
      format,
      country, 
      states,
      divisions,
      resourceType, 
      practiceAreas,
      subPracticeAreas,
      productStatus
    } = req.body;

    const thumbnailFile = req.files?.thumbnail?.[0];
    const file = req.files?.file?.[0];
    const imageFiles = req.files?.images || [];

    let thumbnail = null;
    let fileUrl = null;
    let fileType = null;
    const images = [];


    if (thumbnailFile) {
      const result = await cloudinaryUpload(thumbnailFile.path, `thumb_${Date.now()}`, "resources/thumbnails");
      if (result?.secure_url) thumbnail = result.secure_url;
    }


    if (file) {
      const result = await cloudinaryUpload(
        file.path,
        `doc_${Date.now()}`,
        "resources/files"
      );
      if (result?.secure_url && result.resource_type === "raw") fileUrl = result.secure_url;
      fileType = file.mimetype || "application/octet-stream";
    }


    for (const imageFile of imageFiles) {
      const result = await cloudinaryUpload(imageFile.path, `img_${Date.now()}`, "resources/images");
      if (result?.secure_url) {
        images.push(result.secure_url);
      }
    }

    // let status = "pending";
    // if (req.user.role === "ADMIN") {
    //   status = "approved";
    // }

    const resource = await createResourceService({
      title,
      description,
      discountPrice,
      quantity,
      format,
      file: {
        url: fileUrl,
        type: fileType
      },
      thumbnail,
      images,
      country,
      states: states || [],
      divisions: divisions || [],
      resourceType: resourceType || [],
      createdBy,
      status: productStatus,
      practiceAreas: practiceAreas || [],
      subPracticeAreas: subPracticeAreas || [],
      
    });

    generateResponse(res, 201, true, "Resource created successfully", resource);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to create resource", error.message);
  }
};


export const getAllResources = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const {
    status,
    sellerId,
    resourceType,
    price,
    practiceAreas,
    fileType,
    search,
    country,
    states,
    divisions,
    format,
    sortedBy,
    subPracticeAreas
  } = req.query;

  try {
    const priceRange = price ? price.split(',').map(Number) : null;
    const statesArray = states ? states.split(',') : null;
    const practiceAreasArray = practiceAreas ? practiceAreas.split(',') : null;
    const subPracticeAreasArray = subPracticeAreas ? subPracticeAreas.split(',') : null;
    const resourceTypeArray = resourceType ? resourceType.split(',') : null;
    const formatArray = format ? format.split(',') : null;
    const divisionsArray = divisions ? divisions.split(',') : null;

    const { data, pagination } = await getAllResourcesService(
      page,
      limit,
      skip,
      status,
      sellerId,
      resourceTypeArray,
      priceRange,
      practiceAreasArray,
      subPracticeAreasArray,
      fileType,
      search?.toLowerCase(),
      country,
      statesArray,
      divisionsArray,
      formatArray,
      sortedBy,
      
    );

    return res.status(200).json({
      success: true,
      message: 'Fetched resources',
      data,
      pagination
    });
  } catch (error) {
    next(error);
  }
};


export const sellerProfileResources = async (req, res, next) => {
  const sellerId = req.params.sellerId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const {
    status,
    resourceType,
    price,
    practiceAreas,
    fileType,
    search,
    country,
    states,
    divisions,
    format,
    sortedBy,
    subPracticeAreas
  } = req.query;

  try {
    // Parse query parameters
    const priceRange = price ? price.split(',').map(Number) : null;
    const statesArray = states ? states.split(',') : null;
    const practiceAreasArray = practiceAreas ? practiceAreas.split(',') : null;
    const subPracticeAreasArray = subPracticeAreas ? subPracticeAreas.split(',') : null;
    const resourceTypeArray = resourceType ? resourceType.split(',') : null;
    const formatArray = format ? format.split(',') : null;
    const divisionsArray = divisions ? divisions.split(',') : null;

    // Call service
const { sellerProfile, data, pagination } = await getSellerProfileResourcesService(
  sellerId,
  page,
  limit,
  skip,
  status,
  resourceTypeArray,
  priceRange,
  practiceAreasArray,
  subPracticeAreasArray,
  fileType,
  search?.toLowerCase(),
  country,
  statesArray,
  divisionsArray,
  formatArray,
  sortedBy
);


    return res.status(200).json({
      success: true,
      message: "Fetched seller's resources successfully",
      data,
      sellerProfile,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};




export const getResourceById = async (req, res, next) => {
  const resourceId = req.params.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  try {
    const { data, pagination } = await getResourceByIdService(resourceId, page, limit, skip);
    return res.status(200).json({
      success: true,
      message: "Fetched resource successfully",
      data,
      pagination
    });
  } catch (error) {
    if (error.message === "Resource not found") {
      generateResponse(res, 404, false, error.message, null);
    } else {
      next(error);
    }
  }
};


export const updateResource = async (req, res) => {
  try {
    const resourceId = req.params.id;
    const user = req.user;

    const {
      title,
      description,
      discountPrice,
      quantity,
      format,
      country,
      states,
      divisions,
      resourceType,
      practiceAreas,
      subPracticeAreas,
      status
    } = req.body;

    const thumbnailFile = req.files?.thumbnail?.[0];
    const file = req.files?.file?.[0];
    const imageFiles = req.files?.images || [];

    let updatedFields = {};

    if (title !== undefined) updatedFields.title = title;
    if (description !== undefined) updatedFields.description = description;
    if (discountPrice !== undefined) updatedFields.discountPrice = discountPrice;
    if (quantity !== undefined) updatedFields.quantity = quantity;
    if (format !== undefined) updatedFields.format = format;
    if (country !== undefined) updatedFields.country = country;
    if (states !== undefined) updatedFields.states = states;
    if (resourceType !== undefined) updatedFields.resourceType = resourceType;
    if (practiceAreas !== undefined) updatedFields.practiceAreas = practiceAreas;
    if (subPracticeAreas !== undefined) updatedFields.subPracticeAreas = subPracticeAreas;
    if (status !== undefined) updatedFields.status = status;
    if (divisions !== undefined) updatedFields.divisions = divisions;

    if (thumbnailFile) {
      const result = await cloudinaryUpload(
        thumbnailFile.path,
        `thumb_${Date.now()}`,
        "resources/thumbnails"
      );
      if (result?.secure_url) {
        updatedFields.thumbnail = result.secure_url;
      }
    }

    if (file) {
      const result = await cloudinaryUpload(
        file.path,
        `doc_${Date.now()}`,
        "resources/files"
      );
      if (result?.secure_url && result.resource_type === "raw") {
        updatedFields.file = {
          url: result.secure_url,
          type: file.mimetype || "application/octet-stream",
        };
      }
    }

    const isURL = (value) =>
    typeof value === "string" && /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(value);


    if (imageFiles.length) {
      const uploadedImages = [];
      for (const imageFile of imageFiles) {
        if (isURL(imageFile)) {
          uploadedImages.push(imageFile);
          continue;
        }
        const result = await cloudinaryUpload(
          imageFile.path,
          `img_${Date.now()}`,
          "resources/images"
        );
        if (result?.secure_url) {
          uploadedImages.push(result.secure_url);
        }
      }
      updatedFields.images = uploadedImages;
    }

    const updated = await updateResourceService(resourceId, updatedFields, user);

    generateResponse(res, 200, true, "Resource updated successfully", updated);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to update resource", error.message);
  }
};




export const deleteResource = async (req, res) => {
  try {
    const deleted = await deleteResourceService(req.params.id, req.user);
    generateResponse(res, 200, true, "Resource deleted successfully", deleted);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete resource", error.message);
  }
};


export const getSellerResources = async (req, res) => {
  try {
    const myId = req.user._id;
    const resources = await getSellerResourcesService(myId);
    generateResponse(res, 200, true, "Fetched seller resources successfully", resources);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch seller resources", error.message);
  }
};


export const exploreTopSellingResources = async (req, res) => {
  try {
    const { country } = req.query;
    if (!country) {
      return generateResponse(res, 400, false, 'Country is required');
    }

    const resources = await getTopSellingResources(country);
    generateResponse(res, 200, true, 'Top selling resources fetched', resources);
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch top selling resources', error.message);
  }
};


export const exploreMostPopularResources = async (req, res) => {
  try {
    const { country } = req.query;
    if (!country) {
      return generateResponse(res, 400, false, 'Country is required');
    }

    const resources = await getMostPopularResources(country);
    generateResponse(res, 200, true, 'Most popular resources fetched', resources);
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch most popular resources', error.message);
  }
};

