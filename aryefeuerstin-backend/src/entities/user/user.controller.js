import { generateResponse } from '../../lib/responseFormate.js';
import mongoose from 'mongoose';
import {
  getAllUsers,
  getAllAdmins,
  getUserById,
  updateUser,
  deleteUser,

  // avatar
  createAvatarProfile,
  updateAvatarProfile,
  deleteAvatarProfile,

  // multiple avatar
  createMultipleAvatar,
  updateMultipleAvatar,
  deleteMultipleAvatar,

  // pdf
  createUserPDF,
  updateUserPDF,
  deleteUserPDF,

  // admin user
  adminGetUserById,
  adminUpdateUser,
  adminDeleteUser,

  // driver approval (NEW)
  getDriverRequests,
  approveDriver,
  rejectDriver,
  getAllDrivers,
  getDriverStats
} from './user.service.js';
import ReturnOrder from '../returnOrder/returnOrder.model.js';

/* ===================== ADMIN DASHBOARD ===================== */

export const getAllUsersController = async (req, res) => {
  try {
    const { page, limit, search, date } = req.query;
    const { users, paginationInfo } = await getAllUsers({
      page,
      limit,
      search,
      date
    });
    generateResponse(res, 200, true, 'Users fetched successfully', {
      users,
      paginationInfo
    });
  } catch {
    generateResponse(res, 500, false, 'Failed to fetch users', null);
  }
};

export const getAllAdminsController = async (req, res) => {
  try {
    const { page, limit, search, date } = req.query;
    const { admins, paginationInfo } = await getAllAdmins({
      page,
      limit,
      search,
      date
    });
    generateResponse(res, 200, true, 'Admins fetched successfully', {
      admins,
      paginationInfo
    });
  } catch {
    generateResponse(res, 500, false, 'Failed to fetch admins', null);
  }
};

export const getAllDriversController = async (req, res) => {
  try {
    const { page, limit, search, date } = req.query;
    const { drivers, paginationInfo } = await getAllDrivers({
      page,
      limit,
      search,
      date
    });
    generateResponse(res, 200, true, 'Drivers fetched successfully', {
      drivers,
      paginationInfo
    });
  } catch {
    generateResponse(res, 500, false, 'Failed to fetch drivers', null);
  }
};

/* ===================== DRIVER APPROVAL (ADMIN) ===================== */

export const getDriverRequestsController = async (req, res) => {
  try {
    const { page, limit, search, date, status } = req.query;
    const { drivers, paginationInfo } = await getDriverRequests({
      page,
      limit,
      search,
      date,
      status
    });

    generateResponse(res, 200, true, 'Driver requests fetched successfully', {
      drivers,
      paginationInfo
    });
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch driver requests', null);
  }
};

export const approveDriverController = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id;

    const driver = await approveDriver({ driverId: id, adminId });

    generateResponse(res, 200, true, 'Driver approved successfully', driver);
  } catch (error) {
    generateResponse(
      res,
      500,
      false,
      'Failed to approve driver',
      error.message
    );
  }
};

export const rejectDriverController = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id;
    const { reason } = req.body;

    const driver = await rejectDriver({ driverId: id, adminId, reason });

    generateResponse(res, 200, true, 'Driver rejected successfully', driver);
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to reject driver', error.message);
  }
};

/* ===================== USER PROFILE ===================== */

export const getUserProfileController = async (req, res) => {
  try {
    const userId = req.user._id;

    const [user, agg, totalReturnOrders] = await Promise.all([
      getUserById(userId),
      ReturnOrder.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, totalPackages: { $sum: '$numberOfPackages' } } }
      ]),
      ReturnOrder.countDocuments({ user: new mongoose.Types.ObjectId(userId) })
    ]);

    const totalPackages = agg?.[0]?.totalPackages || 0;

    generateResponse(res, 200, true, 'User profile fetched successfully', {
      user,
      totalPackages,
      totalReturnOrders
    });
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch user profile', null);
  }
};

export const updateUserProfileController = async (req, res) => {
  try {
    const updatedUser = await updateUser({
      id: req.user._id,
      ...req.body,
      files: req.files
    });

    generateResponse(
      res,
      200,
      true,
      'User profile updated successfully',
      updatedUser
    );
  } catch (error) {
    generateResponse(
      res,
      500,
      false,
      'Failed to update profile',
      error.message
    );
  }
};

export const deleteOwnAccountController = async (req, res) => {
  try {
    await deleteUser(req.user._id);
    generateResponse(res, 200, true, 'Your account has been deleted', null);
  } catch {
    generateResponse(res, 500, false, 'Failed to delete account', null);
  }
};

/* ===================== ADMIN USER ===================== */

export const adminGetUserByIdController = async (req, res) => {
  try {
    const user = await adminGetUserById(req.params.id);
    generateResponse(res, 200, true, 'User fetched successfully', user);
  } catch {
    generateResponse(res, 500, false, 'Failed to fetch user', null);
  }
};

export const adminUpdateUserController = async (req, res) => {
  try {
    const updatedUser = await adminUpdateUser({
      id: req.params.id,
      ...req.body
    });
    generateResponse(res, 200, true, 'User updated successfully', updatedUser);
  } catch {
    generateResponse(res, 500, false, 'Failed to update user', null);
  }
};

export const adminDeleteUserController = async (req, res) => {
  try {
    await adminDeleteUser(req.params.id);
    generateResponse(res, 200, true, 'User deleted successfully', null);
  } catch {
    generateResponse(res, 500, false, 'Failed to delete user', null);
  }
};

/* ===================== AVATAR ===================== */

export const createAvatarController = async (req, res) => {
  try {
    if (!req.files?.profileImage) {
      return generateResponse(res, 400, false, 'Profile image is required');
    }

    const user = await createAvatarProfile(req.user._id, req.files);
    generateResponse(res, 200, true, 'Avatar uploaded successfully', user);
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to upload avatar', error.message);
  }
};

export const updateAvatarProfileController = async (req, res) => {
  try {
    const user = await updateAvatarProfile(req.user._id, req.files);
    generateResponse(res, 200, true, 'Avatar updated successfully', user);
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to update avatar', error.message);
  }
};

export const deleteAvatarController = async (req, res) => {
  try {
    const user = await deleteAvatarProfile(req.user._id);
    generateResponse(res, 200, true, 'Avatar deleted successfully', user);
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to delete avatar', error.message);
  }
};

/* ===================== MULTIPLE AVATAR ===================== */

export const createMultipleAvatarController = async (req, res) => {
  try {
    const user = await createMultipleAvatar(req.user._id, req.files);
    generateResponse(
      res,
      200,
      true,
      'Multiple avatars uploaded successfully',
      user
    );
  } catch {
    generateResponse(
      res,
      500,
      false,
      'Failed to upload multiple avatars',
      null
    );
  }
};

export const updateMultipleAvatarController = async (req, res) => {
  try {
    const user = await updateMultipleAvatar(req.user._id, req.files);
    generateResponse(
      res,
      200,
      true,
      'Multiple avatars updated successfully',
      user
    );
  } catch {
    generateResponse(
      res,
      500,
      false,
      'Failed to update multiple avatars',
      null
    );
  }
};

export const deleteMultipleAvatarController = async (req, res) => {
  try {
    const user = await deleteMultipleAvatar(req.user._id);
    generateResponse(
      res,
      200,
      true,
      'Multiple avatars deleted successfully',
      user
    );
  } catch {
    generateResponse(
      res,
      500,
      false,
      'Failed to delete multiple avatars',
      null
    );
  }
};

/* ===================== PDF ===================== */

export const createUserPDFController = async (req, res) => {
  try {
    const user = await createUserPDF(req.user._id, req.files);
    generateResponse(res, 200, true, 'PDF uploaded successfully', user);
  } catch {
    generateResponse(res, 500, false, 'Failed to upload PDF', null);
  }
};

export const updateUserPDFController = async (req, res) => {
  try {
    const user = await updateUserPDF(req.user._id, req.files);
    generateResponse(res, 200, true, 'PDF updated successfully', user);
  } catch {
    generateResponse(res, 500, false, 'Failed to update PDF', null);
  }
};

export const deleteUserPDFController = async (req, res) => {
  try {
    const user = await deleteUserPDF(req.user._id);
    generateResponse(res, 200, true, 'PDF deleted successfully', user);
  } catch {
    generateResponse(res, 500, false, 'Failed to delete PDF', null);
  }
};


/* ===================== DRIVER STATS ===================== */

export const getMyDriverStatsController = async (req, res) => {
  try {
    const driverId = req.user._id;
    
    const stats = await getDriverStats(driverId);

    generateResponse(res, 200, true, 'Driver stats fetched successfully', stats);
  } catch (error) {
    generateResponse(
      res,
      500,
      false,
      error.message || 'Failed to fetch driver stats',
      null
    );
  }
};

// For admin to get any driver's stats by ID
export const getDriverStatsController = async (req, res) => {
  try {
    const { id } = req.params;
    
    const stats = await getDriverStats(id);

    generateResponse(res, 200, true, 'Driver stats fetched successfully', stats);
  } catch (error) {
    generateResponse(
      res,
      500,
      false,
      error.message || 'Failed to fetch driver stats',
      null
    );
  }
};
