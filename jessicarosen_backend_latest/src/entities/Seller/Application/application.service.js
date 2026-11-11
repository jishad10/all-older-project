import RoleType from "../../../lib/types.js";
import User from "../../auth/auth.model.js";

// Promote user to seller if email exists
export const promoteToSellerIfUserExists = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('User not found');
  }
  if( user.role === RoleType.SELLER) {
    throw new Error('User is already a seller');
  }
  if (user.role === RoleType.ADMIN) {
    throw new Error('Admin cannot be promoted to seller');
  }

  if (user.role === RoleType.USER) {
    user.role = RoleType.SELLER;
    await user.save();
  }

  return user;
};

// Get all sellers
export const getAllSellersService = async () => {
  return await User.find({ role: RoleType.SELLER }).sort({ createdAt: -1 }).select('-password');
};

// Get a single seller by ID
export const getSellerByIdService = async (id) => {
  const seller = await User.findOne({ _id: id, role: RoleType.SELLER }).select('-password');
  if (!seller) {
    throw new Error('Seller not found');
  }
  return seller;
};

// Delete a seller
export const deleteSellerByIdService = async (id) => {
  const deleted = await User.findOneAndDelete({ _id: id, role: RoleType.SELLER });
  if (!deleted) {
    throw new Error('Seller not found or already deleted');
  }
  return deleted;
};

