import Terms from "./terms.model.js";

// Create new terms entry
export const createTerms = async (data) => {
  return await Terms.create(data);
};

// Get all terms
export const getAllTerms = async () => {
  return await Terms.findOne().sort({ createdAt: -1 }).limit(1);
};

// Get a single terms item by ID
export const getTermsById = async (id) => {
  return await Terms.findById(id);
};

// Update terms item
export const updateTerms = async (id, data) => {
  return await Terms.findByIdAndUpdate(id, data, { new: true });
};

// Delete terms item
export const deleteTerms = async (id) => {
  return await Terms.findByIdAndDelete(id);
};
