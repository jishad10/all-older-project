import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  // who did the action
  actor: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    email:  { type: String, default: 'system' },
    role:   { type: String, default: 'ADMIN' },
  },

  // what action was performed
  action: {
    type: String,
    required: true,
    enum: [
      'account_suspended',
      'account_activated',
      'account_deleted',
      'listing_disabled',
      'listing_enabled',
      'listing_deleted',
      'security_flag_created',
      'security_flag_resolved',
      'config_updated',
      'legal_documents_updated',
      'data_export',
      'plan_created',
      'plan_updated',
      'plan_deleted',
      'island_created',
      'island_updated',
      'island_deleted',
      'review_hidden',
      'review_visible',
      'inquiry_deleted',
    ],
  },

  // what entity was affected
  entity: {
    type:  { type: String, enum: ['user', 'property', 'platform_config', 'security_flag', 'legal_documents', 'plan', 'island', 'review', 'inquiry'] },
    id:    { type: mongoose.Schema.Types.ObjectId, default: null },
    label: { type: String, default: '' }, // e.g. user email, property title
  },

  // details / changes
  details: { type: mongoose.Schema.Types.Mixed, default: {} },

}, { timestamps: true });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog;