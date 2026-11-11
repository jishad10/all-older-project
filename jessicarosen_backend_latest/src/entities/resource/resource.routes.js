import express from "express";
import { createResource, getAllResources,sellerProfileResources, getResourceById, updateResource, deleteResource, getSellerResources, exploreTopSellingResources, exploreMostPopularResources } from "./resource.controller.js";
import { adminSellerMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";
import { multerUpload } from "../../core/middlewares/multer.js";


const router = express.Router();


router
  .route("/my-resource")
  .get(verifyToken, adminSellerMiddleware, getSellerResources)

router
  .route("/seller/:sellerId")
  .get(sellerProfileResources);


router
  .route("/get-all-resources")
  .get(getAllResources);

  
router
  .route("/top-selling")
  .get(exploreTopSellingResources);


router
  .route("/most-popular")
  .get(exploreMostPopularResources);


router.
  route("/")
  .post(verifyToken, adminSellerMiddleware, multerUpload([{ name: "file", maxCount: 1 }, { name: "thumbnail", maxCount: 1 }, { name: "images", maxCount: 10 }]), createResource);


router
  .route('/:id')
  .get(getResourceById)
  .put(verifyToken, adminSellerMiddleware, multerUpload([{ name: "file", maxCount: 1 }, { name: "thumbnail", maxCount: 1 }, { name: "images", maxCount: 10 }]), updateResource)
  .delete(verifyToken, adminSellerMiddleware, deleteResource);


export default router;
