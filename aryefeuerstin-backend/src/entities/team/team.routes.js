import express from "express";
import { 
  createAdmin,
  getAdminById,
  getAllAdmins,
  updateAdminPermissions, 
} from "./team.controller.js";
import { superAdminOrAdminMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";


const router = express.Router();


router.post("/", verifyToken, superAdminOrAdminMiddleware, createAdmin);  
router.get("/", verifyToken, superAdminOrAdminMiddleware, getAllAdmins);  
router.get("/:id", verifyToken, superAdminOrAdminMiddleware, getAdminById); 
router.put("/:id/permissions", verifyToken, superAdminOrAdminMiddleware, updateAdminPermissions);        


export default router;




     