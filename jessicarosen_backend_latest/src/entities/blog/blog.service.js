import Blog from "./blog.model.js";

export const createBlogService = async ({ title, description, thumbnail }) => {
  const blog = new Blog({ title, description, thumbnail });
  return await blog.save();
};

export const getAllBlogsService = async () => {
  return await Blog.find().sort({ createdAt: -1 });
};

export const getBlogByIdService = async (blogId) => {
  return await Blog.findById(blogId);
};

export const updateBlogService = async (blogId, updateData) => {
  const updated = await Blog.findByIdAndUpdate(blogId, updateData, { new: true });
  if (!updated) throw new Error("Blog not found");
  return updated;
};


export const deleteBlogService = async (blogId) => {
  const deleted = await Blog.findByIdAndDelete(blogId);
  if (!deleted) throw new Error("Blog not found or already deleted");
  return deleted;
};
