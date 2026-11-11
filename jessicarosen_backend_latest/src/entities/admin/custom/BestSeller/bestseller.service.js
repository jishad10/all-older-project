import { cloudinaryUpload } from "../../../../lib/cloudinaryUpload.js";
import BestSeller from "./bestseller.model.js";

// Create bestseller
export const createBestSeller = async (data, filePaths = []) => {
  const imageUrls = [];

  for (let i = 0; i < filePaths.length && i < 2; i++) {
    const uploadResult = await cloudinaryUpload(filePaths[i], `bestseller-${Date.now()}-${i}`, "bestseller");
    if (!uploadResult?.url) throw new Error("Image upload failed");
    imageUrls.push(uploadResult.url);
  }

  data.image = imageUrls;
  return await BestSeller.create(data);
};

// Get all bestsellers
export const getAllBestSellers = async () => {
  return await BestSeller.findOne().sort({ createdAt: -1 }).limit(1);
};

// Get bestseller by ID
export const getBestSellerById = async (id) => {
  return await BestSeller.findById(id);
};

// Update bestseller
export const updateBestSeller = async (id, data, filePaths = []) => {
  if (filePaths.length > 0) {
    const imageUrls = [];

    for (let i = 0; i < filePaths.length && i < 2; i++) {
      const uploadResult = await cloudinaryUpload(filePaths[i], `bestseller-${Date.now()}-${i}`, "bestseller");
      if (!uploadResult?.url) throw new Error("Image upload failed");
      imageUrls.push(uploadResult.url);
    }

    data.image = imageUrls;
  }

  return await BestSeller.findByIdAndUpdate(id, data, { new: true });
};

// Delete bestseller
export const deleteBestSeller = async (id) => {
  return await BestSeller.findByIdAndDelete(id);
};
