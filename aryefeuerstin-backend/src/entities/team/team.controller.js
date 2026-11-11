import { generateResponse } from "../../lib/responseFormate.js";
import { createAdminService, getAdminByIdService, getAllAdminsService, updateAdminPermissionsService } from "./team.service.js";


export const createAdmin = async (req, res) => {
  try {
    const { name, email, permissions } = req.body;
    const createdBy = req.user._id;

    const admin = await createAdminService({ name, email, permissions, createdBy });

    return generateResponse(res, 201, true, "Admin created successfully", admin);
  } catch (error) {
    return generateResponse(res, 500, false, error.message, null);
  }
};


export const getAllAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status } = req.query;

    const admins = await getAllAdminsService({
      page: Number(page),
      limit: Number(limit),
      search,
      status,
    });

    return generateResponse(res, 200, true, "Admin list fetched", admins);
  } catch (err) {
    return generateResponse(res, 500, false, err.message, null);
  }
};


export const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await getAdminByIdService(id);

    return generateResponse(res, 200, true, "Admin details fetched", admin);
  } catch (err) {
    return generateResponse(res, 500, false, err.message, null);
  }
};


export const updateAdminPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions, status } = req.body;

    const updatedAdmin = await updateAdminPermissionsService(id, { permissions, status });
    return generateResponse(res, 200, true, "Admin updated successfully", updatedAdmin);
  } catch (err) {
    return generateResponse(res, 500, false, err.message, null);
  }
};





