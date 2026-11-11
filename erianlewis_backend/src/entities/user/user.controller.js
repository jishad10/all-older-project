import { generateResponse } from "../../lib/responseFormate.js";
import {
  getAllUsers,
  getAllAdmins,
  getAllLandlords,
  getAllAgents,
  getUserById,
  updateUser,
  deleteUser,
  createAvatarProfile,
  updateAvatarProfile,
  deleteAvatarProfile,
  createMultipleAvatar,
  updateMultipleAvatar,
  deleteMultipleAvatar,
  createUserPDF,
  updateUserPDF,
  deleteUserPDF,
  adminGetUserById,
  adminUpdateUser,
  adminDeleteUser,
  getAllAccountsService,
  suspendUserService,
  unsuspendUserService,
} from "./user.service.js";


export const getAllUsersController = async (req, res) => {
  try {
    const { page, limit, search, date } = req.query;
    const data = await getAllUsers({ page, limit, search, date });
    generateResponse(res, 200, true, 'Users fetched successfully', data);
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch users', null);
  }
};

export const getAllAdminsController = async (req, res) => {
  try {
    const { page, limit, search, date } = req.query;
    const data = await getAllAdmins({ page, limit, search, date });
    generateResponse(res, 200, true, 'Admins fetched successfully', data);
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch admins', null);
  }
};

export const getAllLandlordsController = async (req, res) => {
  try {
    const { page, limit, search, date } = req.query;
    const data = await getAllLandlords({ page, limit, search, date });
    generateResponse(res, 200, true, 'Landlords fetched successfully', data);
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch landlords', null);
  }
};

export const getAllAgentsController = async (req, res) => {
  try {
    const { page, limit, search, date } = req.query;
    const data = await getAllAgents({ page, limit, search, date });
    generateResponse(res, 200, true, 'Agents fetched successfully', data);
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch agents', null);
  }
};

export const getUserProfileController = async (req, res) => {
  try {
    const user = await getUserById(req.user._id);
    generateResponse(res, 200, true, "User profile fetched successfully", user);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch user profile", null);
  }
};

export const updateUserProfileController = async (req, res) => {
  try {
    const updatedUser = await updateUser({ id: req.user._id, ...req.body });
    generateResponse(res, 200, true, "User profile updated successfully", updatedUser);
  } catch (error) {
    if (error.message === 'Current password is required to change email') {
      return generateResponse(res, 400, false, error.message, null);
    }
    if (error.message === 'Invalid password') {
      return generateResponse(res, 401, false, error.message, null);
    }
    if (error.message === 'Email already in use') {
      return generateResponse(res, 409, false, error.message, null);
    }
    generateResponse(res, 500, false, error.message || "Failed to update profile", null);
  }
};

export const deleteOwnAccountController = async (req, res) => {
  try {
    await deleteUser(req.user._id, req.body?.currentPassword);
    generateResponse(res, 200, true, "Your account has been deleted", null);
  } catch (error) {
    if (error.message === 'Current password is required to delete account') {
      return generateResponse(res, 400, false, error.message, null);
    }
    if (error.message === 'Invalid password') {
      return generateResponse(res, 401, false, error.message, null);
    }
    if (error.message === 'User not found') {
      return generateResponse(res, 404, false, error.message, null);
    }
    generateResponse(res, 500, false, error.message || "Failed to delete account", null);
  }
};

export const adminGetUserByIdController = async (req, res) => {
  try {
    const user = await adminGetUserById(req.params.id);
    generateResponse(res, 200, true, "User fetched successfully", user);
  } catch (error) {
    const status = error.message === 'User not found' ? 404 : 500;
    generateResponse(res, status, false, error.message || "Failed to fetch user", null);
  }
};

export const adminUpdateUserController = async (req, res) => {
  try {
    const updatedUser = await adminUpdateUser({ id: req.params.id, ...req.body });
    generateResponse(res, 200, true, "User updated successfully", updatedUser);
  } catch (error) {
    const status = error.message === 'User not found' ? 404 : 500;
    generateResponse(res, status, false, error.message || "Failed to update user", null);
  }
};

export const adminDeleteUserController = async (req, res) => {
  try {
    await adminDeleteUser(req.params.id, req.user._id, req.user.email);
    generateResponse(res, 200, true, "User deleted successfully", null);
  } catch (error) {
    const status = error.message === 'User not found' ? 404 : 500;
    generateResponse(res, status, false, error.message || "Failed to delete user", null);
  }
};

export const createAvatarController = async (req, res) => {
  try {
    if (!req.files?.profileImage) return generateResponse(res, 400, false, 'Profile image is required', null);
    const user = await createAvatarProfile(req.user._id, req.files);
    generateResponse(res, 200, true, 'Avatar uploaded successfully', user);
  } catch (error) {
    const status = error.message === 'User not found' ? 404 : 500;
    generateResponse(res, status, false, error.message || 'Failed to upload avatar', null);
  }
};

export const updateAvatarProfileController = async (req, res) => {
  try {
    const user = await updateAvatarProfile(req.user._id, req.files);
    generateResponse(res, 200, true, 'Avatar updated successfully', user);
  } catch (error) {
    generateResponse(res, 500, false, error.message || 'Failed to update avatar', null);
  }
};

export const deleteAvatarController = async (req, res) => {
  try {
    const updatedUser = await deleteAvatarProfile(req.user._id);
    generateResponse(res, 200, true, 'Avatar deleted successfully', updatedUser);
  } catch (error) {
    generateResponse(res, 500, false, error.message || 'Failed to delete avatar', null);
  }
};

export const createMultipleAvatarController = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return generateResponse(res, 400, false, 'At least one avatar image is required', null);
    }
    const user = await createMultipleAvatar(req.user._id, req.files);
    generateResponse(res, 200, true, 'Multiple avatars uploaded successfully', user);
  } catch (error) {
    generateResponse(res, 500, false, error.message || 'Failed to upload multiple avatars', null);
  }
};

export const updateMultipleAvatarController = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return generateResponse(res, 400, false, 'At least one avatar image is required', null);
    }
    const user = await updateMultipleAvatar(req.user._id, req.files);
    generateResponse(res, 200, true, 'Multiple avatars updated successfully', user);
  } catch (error) {
    generateResponse(res, 500, false, error.message || 'Failed to update multiple avatars', null);
  }
};

export const deleteMultipleAvatarController = async (req, res) => {
  try {
    const user = await deleteMultipleAvatar(req.user._id);
    generateResponse(res, 200, true, 'Multiple avatars deleted successfully', user);
  } catch (error) {
    generateResponse(res, 500, false, error.message || 'Failed to delete multiple avatars', null);
  }
};

export const createUserPDFController = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return generateResponse(res, 400, false, 'PDF file is required', null);
    }
    const user = await createUserPDF(req.user._id, req.files);
    generateResponse(res, 200, true, 'PDF uploaded successfully', user);
  } catch (error) {
    generateResponse(res, 500, false, error.message || 'Failed to upload PDF', null);
  }
};

export const updateUserPDFController = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return generateResponse(res, 400, false, 'PDF file is required', null);
    }
    const user = await updateUserPDF(req.user._id, req.files);
    generateResponse(res, 200, true, 'PDF updated successfully', user);
  } catch (error) {
    generateResponse(res, 500, false, error.message || 'Failed to update PDF', null);
  }
};

export const deleteUserPDFController = async (req, res) => {
  try {
    const user = await deleteUserPDF(req.user._id);
    generateResponse(res, 200, true, 'PDF deleted successfully', user);
  } catch (error) {
    generateResponse(res, 500, false, error.message || 'Failed to delete PDF', null);
  }
};


// Admin — all accounts with filters
export const getAllAccountsController = async (req, res, next) => {
  try {
    const { page, limit, search, role, status, island } = req.query;
    const data = await getAllAccountsService({ page, limit, search, role, status, island });
    return generateResponse(res, 200, true, 'Accounts fetched', data);
  } catch (error) { next(error); }
};


// Admin — suspend user
export const suspendUserController = async (req, res, next) => {
  try {
    const data = await suspendUserService(req.params.id, req.user._id, req.user.email);
    return generateResponse(res, 200, true, 'User suspended', data);
  } catch (error) {
    if (error.message === 'User not found')          return generateResponse(res, 404, false, error.message, null);
    if (error.message === 'Cannot suspend an admin') return generateResponse(res, 403, false, error.message, null);
    if (error.message === 'User is already suspended') return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};


// Admin — unsuspend user
export const unsuspendUserController = async (req, res, next) => {
  try {
    const data = await unsuspendUserService(req.params.id, req.user._id, req.user.email);
    return generateResponse(res, 200, true, 'User unsuspended', data);
  } catch (error) {
    if (error.message === 'User not found')         return generateResponse(res, 404, false, error.message, null);
    if (error.message === 'User is not suspended')  return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};
