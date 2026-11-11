import { createFilter, createPaginationInfo } from "../../lib/pagination.js";
import cloudinary, { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";
import User from "../auth/auth.model.js";
import RoleType from "../../lib/types.js";
import fs from "fs";
import Order from "../Payment/order.model.js";
import mongoose from "mongoose";
import Resource from "../resource/resource.model.js";


// Get all users
export const getAllUsers = async ({ page = 1, limit = 10, search, date }) => {
  const filter = createFilter(search, date);
  const totalUsers = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const paginationInfo = createPaginationInfo(page, limit, totalUsers);
  return { users, paginationInfo };
};


// Get all admins
export const getAllAdmins = async ({ page = 1, limit = 10, search, date }) => {
  const filter = createFilter(search, date);
  const totalAdmins = await User.countDocuments({ ...filter, role: RoleType.ADMIN });
  const admins = await User.find({ ...filter, role: RoleType.ADMIN })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const paginationInfo = createPaginationInfo(page, limit, totalAdmins);
  return { admins, paginationInfo };
};


// Get all sellers 
export const getAllSellers = async ({ page = 1, limit = 10, search, date }) => {
  const filter = createFilter(search, date);
  const totalSellers = await User.countDocuments({ ...filter, role: RoleType.SELLER });
  const sellers = await User.find({ ...filter, role: RoleType.SELLER })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const paginationInfo = createPaginationInfo(page, limit, totalSellers);
  return { sellers, paginationInfo };
};


// Get user by ID
export const getUserById = async (userId) => {
  const user = await User.findById(userId).select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};


// Update user
export const updateUser = async ({ id, ...updateData }) => {
  const updatedUser = await User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

  if (!updatedUser) {
    throw new Error('User not found');
  }
  return updatedUser;
};


// Delete user
export const deleteUser = async (userId) => {
  const deletedUser = await User.findByIdAndDelete(userId);
  if (!deletedUser) {
    throw new Error('User not found');
  }
  return true;
};





export const followSeller = async (userId, sellerId) => {
  if (userId === sellerId) {
    throw new Error("You cannot follow yourself");
  }

  const seller = await User.findById(sellerId);
  if (!seller) {
    throw new Error("Seller not found");
  }

  if (seller.role !== "SELLER") {
    throw new Error("Only sellers can be followed");
  }

  // increment followers
  seller.followers += 1;
  await seller.save();

  return seller;
};




// Upload avatar
export const createAvatarProfile = async (id, files) => {

  const userFound = await User.findById({_id: id});

  if (!userFound) throw new Error('User not found');

  const profileImage = files.profileImage[0];
  
  // Generate secure filename
  const sanitizedTitle = `${userFound._id}-${Date.now()}`; 
  let cloudinaryResult;

  try {
    cloudinaryResult = await cloudinaryUpload(profileImage.path, sanitizedTitle, "user-profile");
    if (!cloudinaryResult?.url) throw new Error('Cloudinary upload failed');

    // Update user 
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { profileImage: cloudinaryResult.url },
      { new: true }
    ).select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

    return updatedUser;
  } catch (error) {
    console.error('Error in createAvatarProfile:', error);
    throw error;
  } finally {
    // Always clean up temp file
    fs.unlink(profileImage.path, () => {}); 
  }
};


// Upload avatar profile
export const updateAvatarProfile = async (id, files) => {
  const userFound = await User.findById(id);
  if (!userFound) {
    throw new Error('User not found');
  }

  if (!files || !files.profileImage || files.profileImage.length === 0) {
    throw new Error('Profile image is required');
  }

  const profileImage = files.profileImage[0];

  if (userFound.profileImage) {
    const publicId = userFound.profileImage.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(publicId);
  }

  const fullName = userFound.fullName || "user";
  const sanitizedTitle = fullName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[?&=]/g, "");
  

  const imgUrl = await cloudinaryUpload(profileImage.path, sanitizedTitle, "user-profile");
  if (imgUrl === "file upload failed") {
    throw new Error('File upload failed');
  }

  const updatedUser = await User.findByIdAndUpdate(id, { profileImage: imgUrl.url }, { new: true })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

  return updatedUser;
};


export const deleteAvatarProfile = async (id) => {
  const userFound = await User.findById(id);
  if (!userFound) throw new Error('User not found');
  if (!userFound.profileImage) throw new Error('No profile image to delete');

  try {
    // Extract public ID from URL 
    const imageUrl = userFound.profileImage;
    const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];
    
    // Delete from Cloudinary
    const cloudinaryResult = await cloudinary.uploader.destroy(publicId);
    
    // Verify deletion was successful
    if (cloudinaryResult.result !== 'ok') {
      throw new Error(`Cloudinary deletion failed: ${cloudinaryResult.result}`);
    }

    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { profileImage: '' },
      { new: true }
    ).select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

    return updatedUser;
  } catch (error) {
    console.error('Error in deleteAvatarProfile:', error);
    throw error; 
  }
};


export const createMultipleAvatar = async (id, files) => {
  const userFound = await User.findById(id);
  if (!userFound) {
    throw new Error('User not found');
  }

  if (!files || !files.multiProfileImage || files.multiProfileImage.length === 0) {
    throw new Error('Profile images are required');
  }

  const imageUrls = await Promise.all(files.multiProfileImage.map(async (image, index) => {
    const sanitizedTitle = `${userFound.fullName.toLowerCase().replace(/\s+/g, "-").replace(/[?&=]/g, "")}-${index}`;
    const imgUrl = await cloudinaryUpload(image.path, sanitizedTitle, "user-profile");
    if (imgUrl === "file upload failed") {
      throw new Error('File upload failed');
    }
    return imgUrl.url;
  }));

  const updatedUser = await User.findByIdAndUpdate(id, { multiProfileImage: imageUrls }, { new: true })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

  return updatedUser;
};


export const updateMultipleAvatar = async (id, files) => {
  const userFound = await User.findById(id);
  if (!userFound) {
    throw new Error('User not found');
  }

  if (!files || !files.multiProfileImage || files.multiProfileImage.length === 0) {
    throw new Error('Profile images are required');
  }

  const imageUrls = await Promise.all(files.multiProfileImage.map(async (image, index) => {
    const sanitizedTitle = `${userFound.fullName.toLowerCase().replace(/\s+/g, "-").replace(/[?&=]/g, "")}-${index}`;
    const imgUrl = await cloudinaryUpload(image.path, sanitizedTitle, "user-profile");
    if (imgUrl === "file upload failed") {
      throw new Error('File upload failed');
    }
    return imgUrl.url;
  }));

  const updatedUser = await User.findByIdAndUpdate(id, { multiProfileImage: imageUrls }, { new: true })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

  return updatedUser;
};


export const deleteMultipleAvatar = async (id) => {
  const userFound = await User.findById(id);
  if (!userFound) {
    throw new Error('User not found');
  }

  if (!userFound.multiProfileImage || userFound.multiProfileImage.length === 0) {
    throw new Error('No profile images to delete');
  }

  const publicIds = userFound.multiProfileImage.map((image) => image.split('/').pop().split('.')[0]);
  await Promise.all(publicIds.map((publicId) => cloudinary.uploader.destroy(publicId)));

  const updatedUser = await User.findByIdAndUpdate(id, { multiProfileImage: [] }, { new: true })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

  return updatedUser;
};  


// Upload user PDF
export const createUserPDF = async (id, files) => {
  const userFound = await User.findById(id);
  if (!userFound) {
    throw new Error('User not found');
  }

  if (!files || !files.userPDF || files.userPDF.length === 0) {
    throw new Error('PDF file is required');
  }

  const userPDF = files.userPDF[0];
  const sanitizedTitle = userFound.fullName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[?&=]/g, "");

  const pdfUrl = await cloudinaryUpload(userPDF.path, sanitizedTitle, "user-pdf");
  if (pdfUrl === "file upload failed") {
    throw new Error('File upload failed');
  }

  const updatedUser = await User.findByIdAndUpdate(id, { pdfFile: pdfUrl.url }, { new: true })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

  return updatedUser;
};


export const updateUserPDF = async (id, files) => {
  const userFound = await User.findById(id);
  if (!userFound) {
    throw new Error('User not found');
  }

  if (!files || !files.userPDF || files.userPDF.length === 0) {
    throw new Error('PDF file is required');
  }

  const userPDF = files.userPDF[0];
  const sanitizedTitle = userFound.fullName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[?&=]/g, "");

  const pdfUrl = await cloudinaryUpload(userPDF.path, sanitizedTitle, "user-pdf");
  if (pdfUrl === "file upload failed") {
    throw new Error('File upload failed');
  }

  const updatedUser = await User.findByIdAndUpdate(id, { pdfFile: pdfUrl.url }, { new: true })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

  return updatedUser;
};


export const deleteUserPDF = async (id) => {
  const userFound = await User.findById(id);
  if (!userFound) {
    throw new Error('User not found');
  }

  if (!userFound.pdfFile) {
    throw new Error('No PDF file to delete'); 
  }

  const publicId = userFound.pdfFile.split('/').pop().split('.')[0];
  await cloudinary.uploader.destroy(publicId);

  const updatedUser = await User.findByIdAndUpdate(id, { pdfFile: null }, { new: true })
    .select("-password -createdAt -updatedAt -__v -verificationCode -verificationCodeExpires");

  return updatedUser;
};


export const getUserOrdersSevice = async (userId, page = 1, limit = 10) => {
  const orders = await Order.find({ user: userId, paymentStatus: "paid" })
    .sort({ createdAt: -1 })
    .select("items.price items.status items.resource createdAt")
    .populate({
      path: "items.resource",
      select: "title file thumbnail"
    })
    .lean();

  const allItems = orders.flatMap(order =>
    order.items.map(item => ({
      orderId: order._id,
      resourceName: item.resource?.title || "N/A",
      file: item.resource?.file || null,
      thumbnail: item.resource?.thumbnail || null,
      price: `$${item.price.toFixed(2)}`,
      date: new Date(order.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      }),
      status: item.status
    }))
  );

  const totalItems = allItems.length;
  const totalPages = Math.ceil(totalItems / limit);
  const skip = (page - 1) * limit;

  const data = allItems.slice(skip, skip + limit);

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit
    }
  };
};





export const getOrderDetailsService = async (orderId, userId) => {
  const order = await Order.findOne({ _id: orderId, user: userId })
    .populate({
      path: 'items.resource',
      select: 'title description file thumbnail',
    })
    .populate({
      path: 'items.seller',
      select: 'name email'
    })
    .populate({
      path: 'user',
      select: 'name email'
    });

  return order;
};

export const getOneOrderDetailsService = async (orderId) => {
  const order = await Order.findOne({ _id: orderId })
    .populate({
      path: 'items.resource',
      select: 'title description file thumbnail',
    })
    .populate({
      path: 'items.seller',
      select: 'name email'
    })
    .populate({
      path: 'user',
      select: 'name email'
    });

  return order;
};



export const getUserProfilesWithOrderStatsService = async (page = 1, limit = 10) => {
   const skip = (page - 1) * limit;

  // Step 1: Count total users
  const totalItems = await User.countDocuments({ role: 'USER' });

  // Step 2: Get paginated users
  const users = await User.find({ role: 'USER' }, '_id firstName profileImage')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })

  // Step 2: Aggregate order stats for those users only
  const userIds = users.map(user => user._id);

  const orderStats = await Order.aggregate([
    {
      $match: {
        user: { $in: userIds }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$user',
        totalOrders: { $sum: 1 },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ['$items.status', 'delivered'] }, 1, 0] }
        },
        pendingOrders: {
          $sum: { $cond: [{ $in: ['$items.status', ['processing', 'shipped']] }, 1, 0] }
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$items.status', 'cancelled'] }, 1, 0] }
        }
      }
    }
  ]);

  const statsMap = {};
  orderStats.forEach(stat => {
    statsMap[stat._id.toString()] = stat;
  });

  // Step 4: Merge users with stats
  const data = users.map(user => {
    const stat = statsMap[user._id.toString()] || {};
    return {
      id: user._id,
      name: user.firstName,
      profileImage: user.profileImage || '',
      totalOrders: stat.totalOrders || 0,
      deliveredOrders: stat.deliveredOrders || 0,
      pendingOrders: stat.pendingOrders || 0,
      cancelledOrders: stat.cancelledOrders || 0
    };
  });

   return {
    data,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      itemsPerPage: limit
    }
  };
};


export const getUserProfileWithStatsServiceId = async (userId) => {
  // 1. Find user
  const user = await User.findById(userId).select(
    '_id firstName lastName phoneNumber email role bio profileImage multiProfileImage pdfFile hasActiveSubscription subscriptionExpireDate address createdAt'
  ).lean();

  if (!user) return null;

  // 2. Aggregate order stats
  const stats = await Order.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$user',
        totalOrders: { $sum: 1 },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ['$items.status', 'delivered'] }, 1, 0] }
        },
        pendingOrders: {
          $sum: { $cond: [{ $in: ['$items.status', ['processing', 'shipped']] }, 1, 0] }
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$items.status', 'cancelled'] }, 1, 0] }
        }
      }
    }
  ]);

  const stat = stats[0] || {};

  // 3. Merge user with stats
  return {
    id: user._id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    bio: user.bio,
    profileImage: user.profileImage,
    multiProfileImage: user.multiProfileImage || [],
    pdfFile: user.pdfFile,
    hasActiveSubscription: user.hasActiveSubscription,
    subscriptionExpireDate: user.subscriptionExpireDate,
    address: user.address,
    createdAt: user.createdAt,

    // order stats
    totalOrders: stat.totalOrders || 0,
    deliveredOrders: stat.deliveredOrders || 0,
    pendingOrders: stat.pendingOrders || 0,
    cancelledOrders: stat.cancelledOrders || 0
  };
};


export const getSellerProfilesWithSalesStatsService = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  // Step 1: Count total sellers
  const totalItems = await User.countDocuments({ role: 'SELLER' });

  // Step 2: Paginated seller fetch
  const sellers = await User.find({ role: 'SELLER' }, '_id firstName profileImage')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const sellerIds = sellers.map(seller => seller._id);

  // Step 3: Count resources per seller
  const resourceCounts = await Resource.aggregate([
    { $match: { createdBy: { $in: sellerIds } } },
    {
      $group: {
        _id: '$createdBy',
        SellerProduct: { $sum: 1 }
      }
    }
  ]);

  const productMap = {};
  resourceCounts.forEach(item => {
    productMap[item._id.toString()] = item.SellerProduct;
  });

  const data = sellers.map(seller => ({
    id: seller._id,
    name: seller.firstName,
    profileImage: seller.profileImage || '',
    SellerProduct: productMap[seller._id.toString()] || 0
  }));

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      itemsPerPage: limit
    }
  };
};



export const getSellerProfileWithStatsServiceId = async (sellerId) => {
  // 1. Find seller
  const seller = await User.findById(sellerId).select(
    '_id firstName lastName phoneNumber email role bio profileImage multiProfileImage pdfFile address createdAt'
  ).lean();

  if (!seller || seller.role !== 'SELLER') return null;


  const totalProducts = await Resource.countDocuments({ createdBy: sellerId });

  return {
    id: seller._id,
    name: `${seller.firstName} ${seller.lastName}`,
    email: seller.email,
    phoneNumber: seller.phoneNumber,
    role: seller.role,
    bio: seller.bio,
    profileImage: seller.profileImage,
    multiProfileImage: seller.multiProfileImage || [],
    pdfFile: seller.pdfFile,
    address: seller.address,
    createdAt: seller.createdAt,
    totalProducts,
  };
};


export const getHappyCustomersService = async () => {
  const topBuyers = await Order.aggregate([
    { $match: { paymentStatus: "paid" } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$user",
        totalItemsPurchased: { $sum: "$items.quantity" }
      }
    },
    { $sort: { totalItemsPurchased: -1 } },
    { $limit: 4 }
  ]);

  // collect only non-null IDs
  const userIds = topBuyers.map(user => user._id).filter(Boolean);

  const users = await User.find({ _id: { $in: userIds } })
    .select("profileImage")
    .lean();

  const userMap = new Map(
    users.filter(u => u?._id).map(user => [user._id.toString(), user])
  );

  const sortedUsers = topBuyers
    .map(u => userMap.get(u._id?.toString()))
    .filter(Boolean);

  return sortedUsers;
};
