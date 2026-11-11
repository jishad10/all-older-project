import mongoose from 'mongoose';

// Reply from landlord to the inquiry sender
const ReplySchema = new mongoose.Schema({
  message:   { type: String, required: true },
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  repliedAt: { type: Date, default: Date.now },
}, { _id: true });

// Internal admin note — only admin can see these
const AdminNoteSchema = new mongoose.Schema({
  note:      { type: String, required: true },
  addedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  addedAt:   { type: Date, default: Date.now },
}, { _id: true });

const InquirySchema = new mongoose.Schema({
  // property being inquired about
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'RentalProperty', required: true },

  // landlord/agent who owns the property
  landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // sender info (can be guest or logged-in user)
  sentBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  fullName:  { type: String, required: true },
  email:     { type: String, required: true },
  phone:     { type: String, default: '' },
  message:   { type: String, required: true },

  // landlord replies (visible to sender via email)
  replies: { type: [ReplySchema], default: [] },

  // admin-only internal notes
  adminNotes: { type: [AdminNoteSchema], default: [] },

  // IP location tracking
  isInternational:     { type: Boolean, default: false },
  inquirerCountry:     { type: String, default: '' },
  inquirerCountryCode: { type: String, default: '' },

  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'closed'],
    default: 'new',
  },
}, { timestamps: true });

const Inquiry = mongoose.model('Inquiry', InquirySchema);
export default Inquiry;