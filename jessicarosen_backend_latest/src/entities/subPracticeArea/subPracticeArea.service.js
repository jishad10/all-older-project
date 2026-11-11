import SubResourceType from "./subPracticeArea.model.js";

export const createSubResourceTypeService = async ({ name, description, createdBy, subResources }) => {
  const existing = await SubResourceType.findOne({ name: name.trim() });
  if (existing) throw new Error("SubResourceType already exists.");

  const subResourceType = new SubResourceType({ name, description, createdBy });
  await subResourceType.save();

  if (Array.isArray(subResources)) {
    await Promise.all(
      subResources.map((resName) =>
        new SubResourceType({ name: resName.trim(), resourceType: subResourceType._id }).save()
      )
    );
  }

  return subResourceType;
};

export const getAllSubResourceTypesService = async (page, limit, skip) => {
  const resourceTypes = await SubResourceType.find({})
    .populate("createdBy", "firstName lastName email")
    .sort({ createdAt: -1 })
    .select("-__v -updatedAt")
    .lean();

  const modified = await Promise.all(resourceTypes.map(async (type) => {
    const subCount = await SubResource.countDocuments({ resourceType: type._id });
    return { ...type, subResourcesCount: subCount };
  }));

  const totalItems = modified.length;
  const totalPages = Math.ceil(totalItems / limit);
  const paginated = modified.slice(skip, skip + limit);

  return {
    data: paginated,
    pagination: { currentPage: page, totalPages, totalItems, itemsPerPage: limit }
  };
};

export const getSubResourceTypeByIdService = async (id) => {
  return await SubResourceType.findById(id);
};

export const updateSubResourceTypeService = async (id, updateData) => {
  const updated = await SubResourceType.findByIdAndUpdate(id, updateData, { new: true });
  if (!updated) throw new Error("SubResourceType not found");
  return updated;
};

export const deleteSubResourceTypeService = async (id) => {
  const deleted = await SubResourceType.findByIdAndDelete(id);
  if (!deleted) throw new Error("SubResourceType not found or already deleted");
  await SubResource.deleteMany({ resourceType: id });
  return deleted;
};
