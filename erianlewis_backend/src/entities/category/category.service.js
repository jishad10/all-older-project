import Category from './category.model.js';


export const getAllCategoriesService = async () => {
  return Category.find({ status: 'active' }).sort({ name: 1 });
};

export const adminGetAllCategoriesService = async () => {
  return Category.find().sort({ name: 1 });
};

export const createCategoryService = async ({ name }) => {
  if (!name) throw new Error('Category name is required');
  const existing = await Category.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
  if (existing) throw new Error('Category already exists');
  return Category.create({ name });
};

export const updateCategoryService = async (id, { name, status }) => {
  const category = await Category.findById(id);
  if (!category) throw new Error('Category not found');
  if (name)   category.name   = name;
  if (status) category.status = status;
  await category.save();
  return category;
};

export const deleteCategoryService = async (id) => {
  const category = await Category.findById(id);
  if (!category) throw new Error('Category not found');
  await Category.findByIdAndDelete(id);
  return true;
};