import AuditLog from './auditLog.model.js';

/**
 * Call this from any service/controller when an admin action happens
 * Example:
 *   await createAuditLog({
 *     actor:   { userId: req.user._id, email: req.user.email, role: req.user.role },
 *     action:  'account_suspended',
 *     entity:  { type: 'user', id: userId, label: user.email },
 *     details: { reason: 'suspicious activity' }
 *   });
 */
export const createAuditLog = async ({ actor, action, entity, details = {} }) => {
  try {
    await AuditLog.create({ actor, action, entity, details });
  } catch (err) {
    // never block main flow if audit log fails
    console.error('Audit log error:', err.message);
  }
};