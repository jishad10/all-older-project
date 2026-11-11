import SecurityFlag from './securityFlag.model.js';
import User from '../auth/auth.model.js';
import RentalProperty from '../rentalProperty/rentalProperty.model.js';
import { createPaginationInfo } from '../../lib/pagination.js';
import { createAuditLog } from '../auditLog/auditLog.helper.js';


// populate helper — gets full user info + island + plan + listing count
const populateFlag = (query) =>
  query
    .populate({
      path: 'user',
      select: 'firstName lastName email role accountStatus profileImage subscription individual business',
      populate: [
        { path: 'subscription.planId', select: 'name title price billingCycle' },
        { path: 'individual.operatingLocations', select: 'name' },
        { path: 'business.operatingLocations',   select: 'name' },
      ],
    })
    .populate('createdBy', 'firstName lastName email')
    .populate('resolvedBy', 'firstName lastName email');


/**
 * Get all security flags
 * Filters: status (unresolved/resolved/all), severity, userId
 */
export const getAllFlagsService = async ({ page = 1, limit = 10, status, severity, userId }) => {
  const numericPage  = Number(page)  || 1;
  const numericLimit = Number(limit) || 10;

  const filter = {};

  if (status === 'unresolved') filter.resolved = false;
  if (status === 'resolved')   filter.resolved = true;
  if (severity && severity !== 'all') filter.severity = severity;
  if (userId) filter.user = userId;

  const total = await SecurityFlag.countDocuments(filter);

  const flags = await populateFlag(
    SecurityFlag.find(filter).sort({ createdAt: -1 })
  )
    .skip((numericPage - 1) * numericLimit)
    .limit(numericLimit);

  // attach listing count per flagged user
  const flagsWithListings = await Promise.all(
    flags.map(async (flag) => {
      const listingCount = flag.user?._id
        ? await RentalProperty.countDocuments({ createdBy: flag.user._id })
        : 0;

      const obj = flag.toObject();
      if (obj.user) {
        obj.user.listingCount = listingCount;
      } else {
        obj.user = null; // user might have been deleted; keep structure predictable
      }
      return obj;
    })
  );

  return { flags: flagsWithListings, paginationInfo: createPaginationInfo(numericPage, numericLimit, total) };
};


/**
 * Get single flag by id
 */
export const getFlagByIdService = async (flagId) => {
  const flag = await populateFlag(SecurityFlag.findById(flagId));
  if (!flag) throw new Error('Security flag not found');

  const listingCount = flag.user?._id
    ? await RentalProperty.countDocuments({ createdBy: flag.user._id })
    : 0;

  const obj = flag.toObject();
  if (obj.user) {
    obj.user.listingCount = listingCount;
  } else {
    obj.user = null;
  }
  return obj;
};


/**
 * Create flag — admin searches user by email/name then flags them
 */
export const createFlagService = async (adminId, adminEmail, { userId, flagType, severity, description }) => {
  if (!userId)   throw new Error('User is required');
  if (!flagType) throw new Error('Flag type is required');
  if (!severity) throw new Error('Severity is required');

  const validSeverities = ['low', 'medium', 'high', 'critical'];
  if (!validSeverities.includes(severity)) throw new Error('Invalid severity');

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const flag = await SecurityFlag.create({
    user:        userId,
    createdBy:   adminId,
    flagType:    flagType.trim(),
    severity,
    description: description || '',
  });

  await createAuditLog({
    actor:   { userId: adminId, email: adminEmail, role: 'ADMIN' },
    action:  'security_flag_created',
    entity:  { type: 'security_flag', id: flag._id, label: user.email },
    details: { flagType, severity },
  });

  return populateFlag(SecurityFlag.findById(flag._id));
};


/**
 * Update flag (PUT — full replace of editable fields)
 */
export const updateFlagService = async (flagId, { flagType, severity, description }) => {
  const flag = await SecurityFlag.findById(flagId);
  if (!flag) throw new Error('Security flag not found');

  const validSeverities = ['low', 'medium', 'high', 'critical'];
  if (severity && !validSeverities.includes(severity)) throw new Error('Invalid severity');

  if (flagType)             flag.flagType    = flagType.trim();
  if (severity)             flag.severity    = severity;
  if (description !== undefined) flag.description = description;

  await flag.save();
  return populateFlag(SecurityFlag.findById(flagId));
};


/**
 * Resolve flag
 */
export const resolveFlagService = async (flagId, adminId, adminEmail) => {
  const flag = await SecurityFlag.findById(flagId);
  if (!flag) throw new Error('Security flag not found');
  if (flag.resolved) throw new Error('Flag is already resolved');

  flag.resolved   = true;
  flag.resolvedBy = adminId;
  flag.resolvedAt = new Date();
  await flag.save();

  await createAuditLog({
    actor:   { userId: adminId, email: adminEmail, role: 'ADMIN' },
    action:  'security_flag_resolved',
    entity:  { type: 'security_flag', id: flagId, label: '' },
    details: {},
  });

  return populateFlag(SecurityFlag.findById(flagId));
};


/**
 * Unresolve / reopen flag
 */
export const unresolveFlagService = async (flagId) => {
  const flag = await SecurityFlag.findById(flagId);
  if (!flag) throw new Error('Security flag not found');
  if (!flag.resolved) throw new Error('Flag is not resolved');

  flag.resolved   = false;
  flag.resolvedBy = null;
  flag.resolvedAt = null;
  await flag.save();

  return populateFlag(SecurityFlag.findById(flagId));
};


/**
 * Delete flag
 */
export const deleteFlagService = async (flagId) => {
  const flag = await SecurityFlag.findById(flagId);
  if (!flag) throw new Error('Security flag not found');
  await SecurityFlag.findByIdAndDelete(flagId);
  return true;
};


/**
 * Search users by email or name — for the "User Email/Name" dropdown in Create Flags form
 */
export const searchUsersForFlagService = async (search) => {
  const filter = search ? {
    $or: [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName:  { $regex: search, $options: 'i' } },
      { email:     { $regex: search, $options: 'i' } },
    ],
  } : {};

  const users = await User.find(filter)
    .select('firstName lastName email role accountStatus profileImage');

  return users;
};