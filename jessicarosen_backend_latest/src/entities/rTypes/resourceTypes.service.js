import ResourceType from "./resourceTypes.model.js";

export const createResourceTypeService = async ({ resourceTypeName, description }) => {
  const existing = await ResourceType.findOne({ resourceTypeName: resourceTypeName.trim() });
  if (existing) throw new Error('Resource Type already exists.');

  const resourceType = new ResourceType({ resourceTypeName, description });
  return await resourceType.save();
};

export const getAllResourceTypesService = async () => {
  const resourceTypes = (
    await ResourceType.find({})
  )
  return resourceTypes;
};

export const getResourceTypeByIdService = async (resourceTypeId) => {
  return await ResourceType.findById(resourceTypeId);
};

export const updateResourceTypeService = async (resourceTypeId, updateData) => {
  const updated = await ResourceType.findByIdAndUpdate(resourceTypeId, updateData, { new: true });
  if (!updated) throw new Error('Resource Type not found');
  return updated;
};

export const deleteResourceTypeService = async (resourceTypeId) => {
  const deleted = await ResourceType.findByIdAndDelete(resourceTypeId);
  if (!deleted) throw new Error('Resource Type not found or already deleted');
  return deleted;
};

