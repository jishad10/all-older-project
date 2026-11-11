import express from "express";
import { createCountry, deleteCountry, getAllCountries, getCountryById, updateCountry } from "./country.controller.js";
import { adminMiddleware, verifyToken } from "../../core/middlewares/authMiddleware.js";

const router = express.Router();

// Public 
router.get('/all', getAllCountries);
router.get('/:id', getCountryById);

// Admin protected
router.post('/', verifyToken, adminMiddleware, createCountry);
router.put('/:id', verifyToken, adminMiddleware, updateCountry);
router.delete('/:id', verifyToken, adminMiddleware, deleteCountry);

export default router;

