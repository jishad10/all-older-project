// src/entities/admin/delete/adminDelete.service.js

/**
 * adminDeleteAccountService
 *
 * Single entry point that:
 *   1. Looks up the target account and validates it exists / is not an ADMIN
 *   2. Dispatches to the correct deletion path (USER vs SELLER)
 *   3. Returns a summary object describing what was cleaned up
 *
 * Soft-delete (hardDelete = false):
 *   - Marks the user document with  isDeleted: true, deletedAt: now
 *   - Anonymises PII fields (name, email, phone, profileImage, etc.)
 *   - Deactivates / unpublishes resources (SELLER) without removing order history
 *   - This is the RECOMMENDED default for an e-commerce platform
 *     because order history, dispute records and financial data must survive
 *
 * Hard-delete (hardDelete = true):
 *   - Permanently removes the User document + every subordinate document
 *   - Deletes Cloudinary assets (profile images, resource files)
 *   - Calls stripe.accounts.del() to deauthorise the connected account
 *   - Should be reserved for GDPR / right-to-erasure requests
 */

import mongoose from 'mongoose';
import Stripe from 'stripe';
import { v2 as cloudinary } from 'cloudinary';

import User     from '../../auth/auth.model.js';
import Resource from '../../resource/resource.model.js';
import Review   from '../../review/review.model.js';
import Order    from '../../Payment/order.model.js';
import Message  from '../../message/message.model.js';
import RoleType from '../../../lib/types.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

/* ─────────────────────────────────────────────
   PUBLIC ENTRY POINT
   ───────────────────────────────────────────── */

export const adminDeleteAccountService = async (userId, hardDelete = false) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (user.role === RoleType.ADMIN) throw new Error('Cannot delete an admin account');

  if (user.role === RoleType.SELLER) {
    return hardDelete
      ? _hardDeleteSeller(user)
      : _softDeleteSeller(user);
  }

  // Regular USER
  return hardDelete
    ? _hardDeleteUser(user)
    : _softDeleteUser(user);
};

/* ─────────────────────────────────────────────
   SOFT DELETE — USER
   ───────────────────────────────────────────── */

const _softDeleteUser = async (user) => {
  // Anonymise & deactivate – keep the document for order reference integrity
  await User.findByIdAndUpdate(user._id, {
    isDeleted: true,
    deletedAt: new Date(),
    firstName: 'Deleted',
    lastName:  'User',
    email:     `deleted_${user._id}@removed.invalid`,
    phoneNumber: '',
    profileImage: '',
    multiProfileImage: [],
    pdfFile: '',
    bio: '',
    about: '',
    refreshToken: '',
    otp: null,
    otpExpires: null,
    isVerified: false,
    hasActiveSubscription: false,
  });

  // Cancel any active promo usage (optional – currently promo model has no userId ref,
  // so nothing to clean up there; add if you add user-level promo tracking later)

  return {
    deletedId: user._id,
    role: RoleType.USER,
    mode: 'soft',
    cascadeResults: {
      accountAnonymised: true,
      note: 'Order history preserved for financial records',
    },
  };
};

/* ─────────────────────────────────────────────
   HARD DELETE — USER
   ───────────────────────────────────────────── */

const _hardDeleteUser = async (user) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let cloudinaryDeleted = 0;

  try {
    // 1. Delete user's own reviews
    const reviewsResult = await Review.deleteMany({ userId: user._id }, { session });

    // 2. Anonymise orders instead of deleting (preserve financial / seller records)
    const ordersUpdated = await Order.updateMany(
      { user: user._id },
      { $set: { user: null, guest: null } },
      { session },
    );

    // 3. Delete Cloudinary assets
    cloudinaryDeleted = await _deleteCloudinaryAssets({
      profileImage: user.profileImage,
      multiProfileImage: user.multiProfileImage,
      pdfFile: user.pdfFile,
    });

    // 4. Remove the user document itself
    await User.findByIdAndDelete(user._id, { session });

    await session.commitTransaction();

    return {
      deletedId: user._id,
      role: RoleType.USER,
      mode: 'hard',
      cascadeResults: {
        reviewsDeleted:    reviewsResult.deletedCount,
        ordersAnonymised:  ordersUpdated.modifiedCount,
        cloudinaryDeleted,
      },
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/* ─────────────────────────────────────────────
   SOFT DELETE — SELLER
   ───────────────────────────────────────────── */

const _softDeleteSeller = async (user) => {
  // 1. Unpublish all seller resources (buyers can no longer purchase them)
  const resourcesUpdated = await Resource.updateMany(
    { createdBy: user._id },
    { $set: { status: 'rejected' } },  // reuse existing enum value to hide from storefront
  );

  // 2. Anonymise the seller account
  await User.findByIdAndUpdate(user._id, {
    isDeleted: true,
    deletedAt: new Date(),
    firstName: 'Deleted',
    lastName:  'Seller',
    email:     `deleted_${user._id}@removed.invalid`,
    phoneNumber: '',
    profileImage: '',
    multiProfileImage: [],
    pdfFile: '',
    bio: '',
    about: '',
    refreshToken: '',
    otp: null,
    otpExpires: null,
    isVerified: false,
    hasActiveSubscription: false,
    // Keep stripeAccountId for potential refund / payout queries later
  });

  return {
    deletedId: user._id,
    role: RoleType.SELLER,
    mode: 'soft',
    cascadeResults: {
      accountAnonymised:  true,
      resourcesUnpublished: resourcesUpdated.modifiedCount,
      note: 'Order history and Stripe account preserved for financial records',
    },
  };
};

/* ─────────────────────────────────────────────
   HARD DELETE — SELLER
   ───────────────────────────────────────────── */

const _hardDeleteSeller = async (user) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let cloudinaryDeleted = 0;
  let stripeDeleted     = false;

  try {
    // 1. Find all seller's resources
    const resources = await Resource.find({ createdBy: user._id }).lean();
    const resourceIds = resources.map((r) => r._id);

    // 2. Delete reviews tied to those resources
    const reviewsResult = resourceIds.length
      ? await Review.deleteMany({ resourceId: { $in: resourceIds } }, { session })
      : { deletedCount: 0 };

    // 3. Delete messages tied to those resources
    const messagesResult = resourceIds.length
      ? await Message.deleteMany({ resource: { $in: resourceIds } }, { session })
      : { deletedCount: 0 };

    // 4. Anonymise orders that contain seller's items
    //    We CANNOT delete orders because buyers own them and they contain
    //    financial data (Stripe payment intents, receipts, etc.)
    //    Instead we null out seller ref and mark item status as 'cancelled'
    const ordersUpdated = await Order.updateMany(
      { 'items.seller': user._id },
      {
        $set: {
          'items.$[elem].seller': null,
          'items.$[elem].status': 'cancelled',
        },
      },
      {
        arrayFilters: [{ 'elem.seller': user._id }],
        session,
      },
    );

    // 5. Delete the resource documents themselves
    const resourcesResult = await Resource.deleteMany(
      { createdBy: user._id },
      { session },
    );

    // 6. Delete Cloudinary assets — profile images + all resource files & thumbnails
    const resourceAssets = resources.flatMap((r) => [
      r.file?.url || null,
      r.thumbnail || null,
      ...(r.images || []),
    ]).filter(Boolean);

    cloudinaryDeleted = await _deleteCloudinaryAssets({
      profileImage:      user.profileImage,
      multiProfileImage: user.multiProfileImage,
      pdfFile:           user.pdfFile,
      extraUrls:         resourceAssets,
    });

    // 7. Delete / deauthorise Stripe connected account (best-effort — don't fail txn)
    if (user.stripeAccountId) {
      try {
        await stripe.accounts.del(user.stripeAccountId);
        stripeDeleted = true;
      } catch (stripeErr) {
        // Log but don't abort — Stripe may already have the account closed
        console.warn(
          `[adminDeleteSeller] Stripe account deletion failed for ${user.stripeAccountId}:`,
          stripeErr.message,
        );
      }
    }

    // 8. Delete the seller document
    await User.findByIdAndDelete(user._id, { session });

    await session.commitTransaction();

    return {
      deletedId: user._id,
      role: RoleType.SELLER,
      mode: 'hard',
      cascadeResults: {
        resourcesDeleted:  resourcesResult.deletedCount,
        reviewsDeleted:    reviewsResult.deletedCount,
        messagesDeleted:   messagesResult.deletedCount,
        ordersAnonymised:  ordersUpdated.modifiedCount,
        cloudinaryDeleted,
        stripeDeleted,
      },
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/* ─────────────────────────────────────────────
   HELPER — Delete Cloudinary assets
   ───────────────────────────────────────────── */

/**
 * Accepts an object of URL fields and deletes each from Cloudinary.
 * Returns the total number of assets successfully deleted.
 */
const _deleteCloudinaryAssets = async ({
  profileImage      = '',
  multiProfileImage = [],
  pdfFile           = '',
  extraUrls         = [],
}) => {
  const allUrls = [
    profileImage,
    ...multiProfileImage,
    pdfFile,
    ...extraUrls,
  ].filter(Boolean);

  if (!allUrls.length) return 0;

  let deleted = 0;

  await Promise.allSettled(
    allUrls.map(async (url) => {
      try {
        // Derive publicId  →  "folder/filename"  (strips extension)
        const parts    = url.split('/');
        const filename = parts.pop().split('.')[0];   // strip extension
        const folder   = parts.slice(-1)[0];          // one-level folder prefix
        const publicId = `${folder}/${filename}`;

        const result = await cloudinary.uploader.destroy(publicId, {
          resource_type: url.match(/\.(pdf|docx?|xlsx?)$/i) ? 'raw' : 'image',
        });

        if (result.result === 'ok' || result.result === 'not found') deleted++;
      } catch (e) {
        console.warn('[_deleteCloudinaryAssets] Failed to delete:', url, e.message);
      }
    }),
  );

  return deleted;
};