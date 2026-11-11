import mongoose from 'mongoose';

const SecurityFlagSchema = new mongoose.Schema({
  // the user being flagged
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // admin who created the flag
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  flagType:    { type: String, required: true, trim: true }, // e.g. suspicious_activity
  severity:    { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  description: { type: String, default: '' },

  resolved:   { type: Boolean, default: false },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

const SecurityFlag = mongoose.model('SecurityFlag', SecurityFlagSchema);
export default SecurityFlag;