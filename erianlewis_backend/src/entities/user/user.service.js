import { createFilter, createPaginationInfo } from "../../lib/pagination.js";
import { createAuditLog } from '../auditLog/auditLog.helper.js';
import cloudinary, { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";
import User from "../auth/auth.model.js";
import RoleType from "../../lib/types.js";
import fs from "fs";


// Get all users (tenants)
export const getAllUsers = async ({ page = 1, limit = 10, search, date }) => {
  const filter = createFilter(search, date);
  filter.role = RoleType.USER;

  const totalUsers = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select("-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return { users, paginationInfo: createPaginationInfo(page, limit, totalUsers) };
};


// Get all admins
export const getAllAdmins = async ({ page = 1, limit = 10, search, date }) => {
  const filter = createFilter(search, date);
  filter.role = RoleType.ADMIN;

  const totalAdmins = await User.countDocuments(filter);
  const admins = await User.find(filter)
    .select("-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return { admins, paginationInfo: createPaginationInfo(page, limit, totalAdmins) };
};


// Get all landlords
export const getAllLandlords = async ({ page = 1, limit = 10, search, date }) => {
  const filter = createFilter(search, date);
  filter.role = RoleType.LANDLORD;

  const totalLandlords = await User.countDocuments(filter);
  const landlords = await User.find(filter)
    .select("-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken")
    .populate("subscription.planId", "name title price billingCycle maxProperties")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return { landlords, paginationInfo: createPaginationInfo(page, limit, totalLandlords) };
};


// Get all agents
export const getAllAgents = async ({ page = 1, limit = 10, search, date }) => {
  const filter = createFilter(search, date);
  filter.role = RoleType.AGENT;

  const totalAgents = await User.countDocuments(filter);
  const agents = await User.find(filter)
    .select("-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken")
    .populate("subscription.planId", "name title price billingCycle maxProperties")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return { agents, paginationInfo: createPaginationInfo(page, limit, totalAgents) };
};


// Get user by ID
export const getUserById = async (userId) => {
  const user = await User.findById(userId)
    .select("-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken")
    .populate("subscription.planId", "name title price billingCycle maxProperties displayFeatures");
  if (!user) throw new Error('User not found');
  return user;
};


// Update user profile (self)
export const updateUser = async ({ id, currentPassword, ...updateData }) => {
  // prevent updating sensitive fields
  delete updateData.password;
  delete updateData.role;
  delete updateData.accountStatus;
  delete updateData.subscription;
  delete updateData.refreshToken;

  const user = await User.findById(id);
  if (!user) throw new Error('User not found');

  // Require the current password when updating email
  if (updateData.email) {
    // Skip email update if it is the same as current
    if (updateData.email === user.email) {
      delete updateData.email;
    } else {
      if (!currentPassword) throw new Error('Current password is required to change email');

      const isMatch = await user.comparePassword(id, currentPassword);
      if (!isMatch) throw new Error('Invalid password');

      const emailTaken = await User.findOne({ email: updateData.email, _id: { $ne: id } });
      if (emailTaken) throw new Error('Email already in use');
    }
  }

  const updatedUser = await User.findByIdAndUpdate(id, updateData, {
    new: true, runValidators: true,
  }).select("-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken");

  return updatedUser;
};


// Delete own account
export const deleteUser = async (userId, currentPassword) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (!currentPassword) throw new Error('Current password is required to delete account');

  const isMatch = await user.comparePassword(userId, currentPassword);
  if (!isMatch) throw new Error('Invalid password');

  await User.findByIdAndDelete(userId);
  return true;
};


// Admin — get user by ID
export const adminGetUserById = async (userId) => {
  const user = await User.findById(userId)
    .select("-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken")
    .populate("subscription.planId", "name title price billingCycle maxProperties displayFeatures");
  if (!user) throw new Error('User not found');
  return user;
};


// Admin — update any user
export const adminUpdateUser = async ({ id, ...updateData }) => {
  const updatedUser = await User.findByIdAndUpdate(id, updateData, {
    new: true, runValidators: true,
  }).select("-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken");

  if (!updatedUser) throw new Error('User not found');
  return updatedUser;
};


// Admin — delete any user
export const adminDeleteUser = async (userId, adminId, adminEmail) => {
  const deletedUser = await User.findByIdAndDelete(userId);
  if (!deletedUser) throw new Error('User not found');

  await createAuditLog({
    actor:   { userId: adminId, email: adminEmail, role: 'ADMIN' },
    action:  'account_deleted',
    entity:  { type: 'user', id: userId, label: deletedUser.email },
    details: { userName: `${deletedUser.firstName} ${deletedUser.lastName}` },
  });

  return true;
};


// Upload single avatar
export const createAvatarProfile = async (id, files) => {
  const userFound = await User.findById(id);
  if (!userFound) throw new Error('User not found');

  const profileImage = files.profileImage[0];
  const sanitizedTitle = `${userFound._id}-${Date.now()}`;

  try {
    const cloudinaryResult = await cloudinaryUpload(profileImage.path, sanitizedTitle, "user-profile");
    if (!cloudinaryResult?.url) throw new Error('Cloudinary upload failed');

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { profileImage: cloudinaryResult.url },
      { new: true }
    ).select("-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken");

    return updatedUser;
  } finally {
    fs.unlink(profileImage.path, () => {});
  }
};


// Update single avatar
export const updateAvatarProfile = async (id, files) => {
  const userFound = await User.findById(id);
  if (!userFound) throw new Error('User not found');

  if (!files?.profileImage?.length) throw new Error('Profile image is required');

  const profileImage = files.profileImage[0];

  if (userFound.profileImage) {
    const publicId = userFound.profileImage.split('/').slice(-2).join('/').split('.')[0];
    await cloudinary.uploader.destroy(publicId).catch(() => {});
  }

  const sanitizedTitle = `${userFound._id}-${Date.now()}`;
  const imgUrl = await cloudinaryUpload(profileImage.path, sanitizedTitle, "user-profile");
  if (imgUrl === "file upload failed") throw new Error('File upload failed');

  const updatedUser = await User.findByIdAndUpdate(id, { profileImage: imgUrl.url }, { new: true })
    .select("-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken");

  return updatedUser;
};


// Delete single avatar
export const deleteAvatarProfile = async (id) => {
  const userFound = await User.findById(id);
  if (!userFound) throw new Error('User not found');
  if (!userFound.profileImage) throw new Error('No profile image to delete');

  const publicId = userFound.profileImage.split('/').slice(-2).join('/').split('.')[0];
  const result = await cloudinary.uploader.destroy(publicId);
  if (result.result !== 'ok') throw new Error(`Cloudinary deletion failed: ${result.result}`);

  const updatedUser = await User.findByIdAndUpdate(id, { profileImage: '' }, { new: true })
    .select("-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken");

  return updatedUser;
};


// Upload multiple avatars
export const createMultipleAvatar = async (id, files) => {
  const userFound = await User.findById(id);
  if (!userFound) throw new Error('User not found');
  if (!files?.multiProfileImage?.length) throw new Error('Profile images are required');

  const imageUrls = await Promise.all(files.multiProfileImage.map(async (image, index) => {
    const sanitizedTitle = `${userFound._id}-multi-${Date.now()}-${index}`;
    const imgUrl = await cloudinaryUpload(image.path, sanitizedTitle, "user-profile");
    if (imgUrl === "file upload failed") throw new Error('File upload failed');
    return imgUrl.url;
  }));

  const updatedUser = await User.findByIdAndUpdate(id, { multiProfileImage: imageUrls }, { new: true })
    .select("-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken");

  return updatedUser;
};


// Update multiple avatars
export const updateMultipleAvatar = async (id, files) => {
  const userFound = await User.findById(id);
  if (!userFound) throw new Error('User not found');
  if (!files?.multiProfileImage?.length) throw new Error('Profile images are required');

  const imageUrls = await Promise.all(files.multiProfileImage.map(async (image, index) => {
    const sanitizedTitle = `${userFound._id}-multi-${Date.now()}-${index}`;
    const imgUrl = await cloudinaryUpload(image.path, sanitizedTitle, "user-profile");
    if (imgUrl === "file upload failed") throw new Error('File upload failed');
    return imgUrl.url;
  }));

  const updatedUser = await User.findByIdAndUpdate(id, { multiProfileImage: imageUrls }, { new: true })
    .select("-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken");

  return updatedUser;
};


// Delete multiple avatars
export const deleteMultipleAvatar = async (id) => {
  const userFound = await User.findById(id);
  if (!userFound) throw new Error('User not found');
  if (!userFound.multiProfileImage?.length) throw new Error('No profile images to delete');

  const publicIds = userFound.multiProfileImage.map(
    (image) => image.split('/').slice(-2).join('/').split('.')[0]
  );
  await Promise.all(publicIds.map((publicId) => cloudinary.uploader.destroy(publicId).catch(() => {})));

  const updatedUser = await User.findByIdAndUpdate(id, { multiProfileImage: [] }, { new: true })
    .select("-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken");

  return updatedUser;
};


// Upload PDF
export const createUserPDF = async (id, files) => {
  const userFound = await User.findById(id);
  if (!userFound) throw new Error('User not found');
  if (!files?.userPDF?.length) throw new Error('PDF file is required');

  const sanitizedTitle = `${userFound._id}-pdf-${Date.now()}`;
  const pdfUrl = await cloudinaryUpload(files.userPDF[0].path, sanitizedTitle, "user-pdf");
  if (pdfUrl === "file upload failed") throw new Error('File upload failed');

  const updatedUser = await User.findByIdAndUpdate(id, { pdfFile: pdfUrl.url }, { new: true })
    .select("-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken");

  return updatedUser;
};


// Update PDF
export const updateUserPDF = async (id, files) => {
  const userFound = await User.findById(id);
  if (!userFound) throw new Error('User not found');
  if (!files?.userPDF?.length) throw new Error('PDF file is required');

  const sanitizedTitle = `${userFound._id}-pdf-${Date.now()}`;
  const pdfUrl = await cloudinaryUpload(files.userPDF[0].path, sanitizedTitle, "user-pdf");
  if (pdfUrl === "file upload failed") throw new Error('File upload failed');

  const updatedUser = await User.findByIdAndUpdate(id, { pdfFile: pdfUrl.url }, { new: true })
    .select("-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken");

  return updatedUser;
};


// Delete PDF
export const deleteUserPDF = async (id) => {
  const userFound = await User.findById(id);
  if (!userFound) throw new Error('User not found');
  if (!userFound.pdfFile) throw new Error('No PDF file to delete');

  const publicId = userFound.pdfFile.split('/').slice(-2).join('/').split('.')[0];
  await cloudinary.uploader.destroy(publicId).catch(() => {});

  const updatedUser = await User.findByIdAndUpdate(id, { pdfFile: null }, { new: true })
    .select("-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken");

  return updatedUser;
};


// ─────────────────────────────────────────────────────────────
// Admin — Get ALL accounts with filters (accounts table view)
// Filters: search (name/email), island, status, role, page, limit
// ─────────────────────────────────────────────────────────────
export const getAllAccountsService = async ({ page = 1, limit = 10, search, role, status, island }) => {
  const numericPage  = Number(page)  || 1;
  const numericLimit = Number(limit) || 10;

  const filter = { role: { $ne: RoleType.ADMIN } }; // exclude admins from accounts table

  // search by name or email
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName:  { $regex: search, $options: 'i' } },
      { email:     { $regex: search, $options: 'i' } },
    ];
  }

  // filter by role (USER / LANDLORD / AGENT)
  if (role && Object.values(RoleType).includes(role) && role !== RoleType.ADMIN) {
    filter.role = role;
  }

  // filter by accountStatus (active / suspended / pending_payment)
  if (status) filter.accountStatus = status;

  // filter by island (operatingLocations for LANDLORD/AGENT, or null for USER)
  if (island) {
    filter.$or = [
      { 'individual.operatingLocations': island },
      { 'business.operatingLocations':   island },
    ];
  }

  const total = await User.countDocuments(filter);
  const accounts = await User.find(filter)
    .select('-password -__v -otp -otpExpires -otpVerified -resetExpires -refreshToken')
    .populate('subscription.planId', 'name title price billingCycle maxProperties')
    .populate('individual.operatingLocations', 'name')
    .populate('business.operatingLocations',   'name')
    .sort({ createdAt: -1 })
    .skip((numericPage - 1) * numericLimit)
    .limit(numericLimit);

  return { accounts, paginationInfo: createPaginationInfo(numericPage, numericLimit, total) };
};


// Admin — Suspend a user
export const suspendUserService = async (userId, adminId, adminEmail) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (user.role === RoleType.ADMIN) throw new Error('Cannot suspend an admin');
  if (user.accountStatus === 'suspended') throw new Error('User is already suspended');

  user.accountStatus = 'suspended';
  await user.save({ validateBeforeSave: false });

  await createAuditLog({
    actor:   { userId: adminId, email: adminEmail, role: 'ADMIN' },
    action:  'account_suspended',
    entity:  { type: 'user', id: userId, label: user.email },
    details: { userName: `${user.firstName} ${user.lastName}` },
  });

  return user;
};


// Admin — Unsuspend a user
export const unsuspendUserService = async (userId, adminId, adminEmail) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (user.accountStatus !== 'suspended') throw new Error('User is not suspended');

  user.accountStatus = 'active';
  await user.save({ validateBeforeSave: false });

  await createAuditLog({
    actor:   { userId: adminId, email: adminEmail, role: 'ADMIN' },
    action:  'account_activated',
    entity:  { type: 'user', id: userId, label: user.email },
    details: { userName: `${user.firstName} ${user.lastName}` },
  });

  return user;
};
