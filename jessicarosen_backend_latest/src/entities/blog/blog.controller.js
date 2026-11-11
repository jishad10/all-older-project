import {
    createBlogService,
    getAllBlogsService,
    getBlogByIdService,
    updateBlogService,
    deleteBlogService
} from "./blog.service.js";
import { cloudinaryUpload } from "../../lib/cloudinaryUpload.js";
import { generateResponse } from "../../lib/responseFormate.js";



export const createBlog = async (req, res) => {
  try {
    const { title, description } = req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];
    let thumbnail = null;

    if (thumbnailFile) {
      const result = await cloudinaryUpload(thumbnailFile.path, `blog_thumb_${Date.now()}`, "blogs/thumbnails");
      if (result?.secure_url) thumbnail = result.secure_url;
    }

    const blog = await createBlogService({ title, description, thumbnail });
    generateResponse(res, 201, true, "Blog created successfully", blog);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to create blog", error.message);
  }
};


export const getAllBlogs = async (req, res) => {
  try {
    const blogs = await getAllBlogsService();
    generateResponse(res, 200, true, "Fetched blogs", blogs);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch blogs", error.message);
  }
};


export const getBlogById = async (req, res) => {
  try {
    const blog = await getBlogByIdService(req.params.id);
    if (!blog) return generateResponse(res, 404, false, "Blog not found");
    generateResponse(res, 200, true, "Fetched blog", blog);
  } catch (error) {
    generateResponse(res, 500, false, "Failed to fetch blog", error.message);
  }
};


export const updateBlog = async (req, res) => {
  try {
    const { title, description } = req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];
    let updateData = { title, description };

    if (thumbnailFile) {
      const result = await cloudinaryUpload(
        thumbnailFile.path,
        `blog_thumb_${Date.now()}`,
        "blogs/thumbnails"
      );
      if (result?.secure_url) {
        updateData.thumbnail = result.secure_url;
      }
    }

    const updated = await updateBlogService(req.params.id, updateData);
    generateResponse(res, 200, true, "Blog updated successfully", updated);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to update blog", error.message);
  }
};



export const deleteBlog = async (req, res) => {
  try {
    const deleted = await deleteBlogService(req.params.id);
    generateResponse(res, 200, true, "Blog deleted successfully", deleted);
  } catch (error) {
    generateResponse(res, 400, false, "Failed to delete blog", error.message);
  }
};
  