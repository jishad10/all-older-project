// src/entities/admin/delete/adminDelete.routes.js

import express from 'express';
import { adminDeleteAccountController } from './adminDelete.controller.js';
import { verifyToken, adminMiddleware } from '../../../core/middlewares/authMiddleware.js';

const router = express.Router();

/**
 * DELETE /v1/admin/accounts/:id
 *
 * Admin-only. Deletes any USER or SELLER by ID.
 * - For a USER  → removes the user document + their reviews + orders (anonymised, not deleted)
 * - For a SELLER → removes the seller document + all their resources + resource reviews +
 *                  resource messages + Cloudinary assets + Stripe account deauthorisation
 *
 * Query param: ?hardDelete=true  (optional, default false)
 *   false → soft-delete: marks user as deleted, anonymises PII  (recommended for audit trail)
 *   true  → hard-delete: permanently removes all documents
 *
 * Examples:
 *   DELETE /v1/admin/accounts/664abc123?hardDelete=false
 *   DELETE /v1/admin/accounts/664abc123?hardDelete=true
 */
router.delete(
  '/:id',
  verifyToken,
  adminMiddleware,
  adminDeleteAccountController,
);

export default router;