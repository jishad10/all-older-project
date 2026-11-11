import Privacy from "./privacy.model.js";

// Create privacy entry
export const createPrivacy = async (data) => {
  return await Privacy.create(data);
};

// Get all privacy policies
export const getAllPrivacy = async () => {
  return await Privacy.findOne().sort({ createdAt: -1 }).limit(1);
};

// Get single privacy by ID
export const getPrivacyById = async (id) => {
  return await Privacy.findById(id);
};

// Update privacy
export const updatePrivacy = async (id, data) => {
  return await Privacy.findByIdAndUpdate(id, data, { new: true });
};

// Delete privacy
export const deletePrivacy = async (id) => {
  return await Privacy.findByIdAndDelete(id);
};
