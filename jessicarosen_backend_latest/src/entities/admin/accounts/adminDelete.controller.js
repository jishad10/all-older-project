// src/entities/admin/delete/adminDelete.controller.js

import { generateResponse } from '../../../lib/responseFormate.js';
import { adminDeleteAccountService } from './adminDelete.service.js';

/**
 * DELETE /v1/admin/accounts/:id
 *
 * Accepts:
 *   - req.params.id   → MongoDB ObjectId of the target user / seller
 *   - req.query.hardDelete → "true" | "false"  (default: "false")
 *
 * Returns:
 *   200  { status, message, data: { deletedId, role, mode, cascadeResults } }
 *   400  bad input
 *   403  attempt to delete another admin
 *   404  user / seller not found
 *   500  unexpected server error
 */
export const adminDeleteAccountController = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from accidentally nuking themselves
    if (req.user._id.toString() === id) {
      return generateResponse(res, 400, false, 'You cannot delete your own admin account', null);
    }

    const hardDelete = req.query.hardDelete === 'true';

    const result = await adminDeleteAccountService(id, hardDelete);

    return generateResponse(
      res,
      200,
      true,
      `Account ${hardDelete ? 'permanently deleted' : 'deactivated'} successfully`,
      result,
    );
  } catch (error) {
    // Surface well-known errors with proper HTTP codes
    if (error.message === 'User not found') {
      return generateResponse(res, 404, false, 'Account not found', null);
    }
    if (error.message === 'Cannot delete an admin account') {
      return generateResponse(res, 403, false, error.message, null);
    }

    console.error('[adminDeleteAccountController] Unexpected error:', error);
    return generateResponse(res, 500, false, 'Failed to delete account', null);
  }
};