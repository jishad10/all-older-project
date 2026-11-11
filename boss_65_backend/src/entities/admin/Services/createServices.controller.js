import { generateResponse } from "../../../lib/responseFormate.js";
import {
  createService,
  getAllServices,
  getServiceByCategoryId,
  getServiceById,
} from "./createServices.service.js";


export const createServiceController = async (req, res) => {
  try {
    const service = await createService(req.body);
    generateResponse(res, 200, true, "Service created successfully", service);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to create service", error.message);
  }
};


export const getAllServicesController = async (req, res) => {
  try {
    const services = await getAllServices();
    generateResponse(res, 200, true, "Services fetched successfully", services);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch services", error.message);
  }
};


export const getServiceByIdController = async (req, res) => {
  try {
    const service = await getServiceById(req.params.id);
    if (!service) {
      return generateResponse(res, 404, false, "Service not found");
    }
    generateResponse(res, 200, true, "Service fetched successfully", service);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch service", error.message);
  }
};


export const getServiceByCategoryIdController = async (req, res) => {
  try {
    const service = await getServiceByCategoryId(req.params.categoryId);
    if (!service) {
      return generateResponse(res, 404, false, "Service not found");
    }
    generateResponse(res, 200, true, "Service fetched successfully", service);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch service", error.message);
  }
};
