import express from "express";
import {
  uploadCmsAsset,
  getAllCmsAssets,

  createBlog,
  updateBlog,
  deleteBlog,
  getBlogById,
  getAllBlogs,
  createFaq,
  getAllFaqs,
  getFaqById,
  updateFaq,
  deleteFaq,

  updateCmsAsset,
  deleteCmsAsset,
  getCmsAssetByIdController,
} from "./cms.controller.js";

import { multerUpload } from "../../../core/middlewares/multer.js";
import { adminMiddleware, verifyToken } from "../../../core/middlewares/authMiddleware.js";

const router = express.Router();
//
// Asset routes
//
router.post(
  "/upload",
  multerUpload([{ name: "file", maxCount: 5 }]),
  uploadCmsAsset
);
router.get("/assets/:id",getCmsAssetByIdController);

router.get("/assets", getAllCmsAssets);

router.put(
  "/update/:id", verifyToken, adminMiddleware,
  multerUpload([{ name: "file", maxCount: 5 }]),
  updateCmsAsset
);
router.delete("/delete/:id", verifyToken, adminMiddleware, deleteCmsAsset);

//
// Blog routes
//
router.get("/blogs", getAllBlogs);
router.get("/blogs/:id", getBlogById);

router.post(
  "/blogs",
  verifyToken,
  adminMiddleware,
  multerUpload([{ name: "thumbnail", maxCount: 1 }]),
  createBlog
);

router.put(
  "/blogs/:id",
  verifyToken,
  adminMiddleware,
  multerUpload([{ name: "thumbnail", maxCount: 1 }]),
  updateBlog
);

router.delete(
  "/blogs/:id",
  verifyToken,
  adminMiddleware,
  deleteBlog
);

//
// FAQ routes
//
router.get("/faqs", getAllFaqs);
router.get("/faqs/:id", verifyToken, adminMiddleware, getFaqById);
router.post("/faqs", verifyToken, adminMiddleware, createFaq);
router.put("/faqs/:id", verifyToken, adminMiddleware, updateFaq);
router.delete("/faqs/:id", verifyToken, adminMiddleware, deleteFaq);


export default router;
