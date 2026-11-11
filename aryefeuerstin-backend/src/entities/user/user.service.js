import { createFilter, createPaginationInfo } from '../../lib/pagination.js';
import cloudinary, { cloudinaryUpload } from '../../lib/cloudinaryUpload.js';
import User from '../auth/auth.model.js';
import RoleType from '../../lib/types.js';
import ReturnOrder from '../returnOrder/returnOrder.model.js';
import fs from 'fs';

const sanitizeName = (user) => {
  const base = `${user.firstName || 'user'}-${user.lastName || ''}`.trim();
  return base.toLowerCase().replace(/\s+/g, '-').replace(/[?&=]/g, '');
};

/* ===================== USERS / ADMINS ===================== */

export const getAllUsers = async ({ page = 1, limit = 10, search, date }) => {
  const filter = createFilter(search, date);
  filter.role = RoleType.USER;

  const totalUsers = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select('-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires')
    .populate('subscription.planId')  // ← ADD THIS LINE
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    users,
    paginationInfo: createPaginationInfo(page, limit, totalUsers)
  };
};

export const getAllAdmins = async ({ page = 1, limit = 10, search, date }) => {
  const filter = createFilter(search, date);
  filter.role = RoleType.ADMIN;

  const totalAdmins = await User.countDocuments(filter);
  const admins = await User.find(filter)
    .select('-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    admins,
    paginationInfo: createPaginationInfo(page, limit, totalAdmins)
  };
};

/* ===================== DRIVERS ===================== */

export const getAllDrivers = async ({ page = 1, limit = 10, search, date }) => {
  const filter = createFilter(search, date);

  filter.role = RoleType.DRIVER;
  filter.driverRequestStatus = "APPROVED"; 

  const totalDrivers = await User.countDocuments(filter);

  const drivers = await User.find(filter)
    .select(
      '-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires'
    )
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    drivers,
    paginationInfo: createPaginationInfo(page, limit, totalDrivers)
  };
};


/* ===================== DRIVER STATS ===================== */

export const getDriverStats = async (driverId) => {
  const driver = await User.findById(driverId);
  if (!driver) throw new Error('Driver not found');
  if (driver.role !== RoleType.DRIVER) throw new Error('User is not a driver');

  // Count completed trips (status = 'COMPLETED')
  const completedTrips = await ReturnOrder.countDocuments({
    assignedDriver: driverId,
    status: 'COMPLETED'
  });

  // Count total assigned trips (all statuses)
  const totalAssignedTrips = await ReturnOrder.countDocuments({
    assignedDriver: driverId
  });

  // Count trips by status
  const tripsByStatus = await ReturnOrder.aggregate([
    { $match: { assignedDriver: driver._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const stats = {
    completedTrips,
    totalAssignedTrips,
    tripsByStatus: tripsByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };

  return stats;
};



/* ===== DRIVER REQUEST MANAGEMENT (ADMIN) ===== */

export const getDriverRequests = async ({
  page = 1,
  limit = 10,
  search,
  date,
  status = 'PENDING'
}) => {
  const filter = createFilter(search, date);
  filter.role = RoleType.DRIVER;
  if (status) filter.driverRequestStatus = status;

  const total = await User.countDocuments(filter);
  const drivers = await User.find(filter)
    .select('-password -__v')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    drivers,
    paginationInfo: createPaginationInfo(page, limit, total)
  };
};

export const approveDriver = async ({ driverId, adminId }) => {
  const driver = await User.findById(driverId);
  if (!driver) throw new Error('User not found');
  if (driver.role !== RoleType.DRIVER) throw new Error('Not a driver');

  driver.driverRequestStatus = 'APPROVED';
  driver.driverApprovedAt = new Date();
  driver.driverApprovedBy = adminId;

  driver.driverRejectedAt = null;
  driver.driverRejectedBy = null;
  driver.driverRejectionReason = '';

  await driver.save({ validateBeforeSave: false });
  return driver;
};

export const rejectDriver = async ({ driverId, adminId, reason = '' }) => {
  const driver = await User.findById(driverId);
  if (!driver) throw new Error('User not found');
  if (driver.role !== RoleType.DRIVER) throw new Error('Not a driver');

  driver.driverRequestStatus = 'REJECTED';
  driver.driverRejectedAt = new Date();
  driver.driverRejectedBy = adminId;
  driver.driverRejectionReason = reason;

  await driver.save({ validateBeforeSave: false });
  return driver;
};

/* ===================== PROFILE ===================== */

export const getUserById = async (userId) => {
  const user = await User.findById(userId)
    .select('-password -__v')
    .populate('subscription.planId');
  if (!user) throw new Error('User not found');
  return user;
};

export const updateUser = async ({ id, files = {}, ...updateData }) => {
  const userFound = await User.findById(id);
  if (!userFound) throw new Error('User not found');

  if (files.drivingLicense?.[0]) {
    const licenseFile = files.drivingLicense[0];
    try {
      const uploadRes = await cloudinaryUpload(
        licenseFile.path,
        `${userFound._id}-driving-license`,
        'driving-license'
      );
      if (!uploadRes?.url) throw new Error('File upload failed');
      updateData.drivingLicense = uploadRes.url;
    } finally {
      fs.unlink(licenseFile.path, () => {});
    }
  }

  return await User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  }).select('-password -__v')
  .populate('subscription.planId');
};

export const deleteUser = async (userId) => {
  const deleted = await User.findByIdAndDelete(userId);
  if (!deleted) throw new Error('User not found');
  return true;
};

/* ===================== ADMIN ===================== */

export const adminGetUserById = async (id) => {
  const user = await User.findById(id)
    .select('-password -__v')
    .populate('subscription.planId');
  if (!user) throw new Error('User not found');
  return user;
};

export const adminUpdateUser = async ({ id, ...data }) => {
  const user = await User.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true
  }).select('-password -__v')
  .populate('subscription.planId');

  if (!user) throw new Error('User not found');
  return user;
};

export const adminDeleteUser = async (id) => {
  const user = await User.findByIdAndDelete(id);
  if (!user) throw new Error('User not found');
  return true;
};

/* ===================== AVATAR ===================== */

export const createAvatarProfile = async (id, files) => {
  const user = await User.findById(id);
  if (!user) throw new Error('User not found');

  const img = files.profileImage[0];
  const upload = await cloudinaryUpload(img.path, `${id}-${Date.now()}`, 'user-profile');
  fs.unlink(img.path, () => {});

  return await User.findByIdAndUpdate(
    id,
    { profileImage: upload.url },
    { new: true }
  ).select('-password -__v')
  .populate('subscription.planId');
};

export const updateAvatarProfile = createAvatarProfile;

export const deleteAvatarProfile = async (id) => {
  const user = await User.findById(id);
  if (!user?.profileImage) throw new Error('No profile image');

  const publicId = user.profileImage.split('/').pop().split('.')[0];
  await cloudinary.uploader.destroy(publicId);

  return await User.findByIdAndUpdate(
    id,
    { profileImage: '' },
    { new: true }
  ).select('-password -__v')
  .populate('subscription.planId');
};

/* ===================== MULTIPLE AVATAR ===================== */

export const createMultipleAvatar = async (id, files) => {
  const user = await User.findById(id);
  if (!user) throw new Error('User not found');

  const urls = await Promise.all(
    files.multiProfileImage.map(async (img, i) => {
      const res = await cloudinaryUpload(img.path, `${id}-${i}`, 'user-profile');
      fs.unlink(img.path, () => {});
      return res.url;
    })
  );

  return await User.findByIdAndUpdate(
    id,
    { multiProfileImage: urls },
    { new: true }
  ).select('-password -__v')
  .populate('subscription.planId');
};

export const updateMultipleAvatar = createMultipleAvatar;

export const deleteMultipleAvatar = async (id) => {
  const user = await User.findById(id);
  if (!user.multiProfileImage.length) throw new Error('No images');

  await Promise.all(
    user.multiProfileImage.map(img =>
      cloudinary.uploader.destroy(img.split('/').pop().split('.')[0])
    )
  );

  return await User.findByIdAndUpdate(
    id,
    { multiProfileImage: [] },
    { new: true }
  ).select('-password -__v')
  .populate('subscription.planId');
};

/* ===================== PDF ===================== */

export const createUserPDF = async (id, files) => {
  const file = files.userPDF[0];
  const upload = await cloudinaryUpload(file.path, id, 'user-pdf');
  fs.unlink(file.path, () => {});

  return await User.findByIdAndUpdate(
    id,
    { pdfFile: upload.url },
    { new: true }
  ).select('-password -__v')
  .populate('subscription.planId');
};

export const updateUserPDF = createUserPDF;

export const deleteUserPDF = async (id) => {
  const user = await User.findById(id);
  if (!user.pdfFile) throw new Error('No PDF');

  const publicId = user.pdfFile.split('/').pop().split('.')[0];
  await cloudinary.uploader.destroy(publicId);

  return await User.findByIdAndUpdate(
    id,
    { pdfFile: null },
    { new: true }
  ).select('-password -__v')
  .populate('subscription.planId');
};

/* ===================== SUBSCRIPTION ===================== */