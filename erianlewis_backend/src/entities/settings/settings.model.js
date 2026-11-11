import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  singleton: { type: Boolean, default: true, unique: true },

  contactSupport: {
    phoneNumbers:   { type: [String], default: [] },
    emailAddresses: { type: [String], default: [] },
    isConfigured:   { type: Boolean, default: false },
  },

  socialLinks: {
    facebook:     { url: { type: String, default: '' }, enabled: { type: Boolean, default: false } },
    instagram:    { url: { type: String, default: '' }, enabled: { type: Boolean, default: false } },
    tiktok:       { url: { type: String, default: '' }, enabled: { type: Boolean, default: false } },
    linkedin:     { url: { type: String, default: '' }, enabled: { type: Boolean, default: false } },
    youtube:      { url: { type: String, default: '' }, enabled: { type: Boolean, default: false } },
    isConfigured: { type: Boolean, default: false },
  },

  knowledgeBase: {
    url:          { type: String, default: '' },
    isConfigured: { type: Boolean, default: false },
  },

  termsOfService: {
    content:      { type: String, default: '' },
    pdfUrl:       { type: String, default: '' },
    pdfPublicId:  { type: String, default: '' },
    inputType:    { type: String, enum: ['text', 'pdf'], default: 'text' },
    isConfigured: { type: Boolean, default: false },
  },

  privacyPolicy: {
    content:      { type: String, default: '' },
    pdfUrl:       { type: String, default: '' },
    pdfPublicId:  { type: String, default: '' },
    inputType:    { type: String, enum: ['text', 'pdf'], default: 'text' },
    isConfigured: { type: Boolean, default: false },
  },

  licensingInformation: {
    content:      { type: String, default: '' },
    pdfUrl:       { type: String, default: '' },
    pdfPublicId:  { type: String, default: '' },
    inputType:    { type: String, enum: ['text', 'pdf'], default: 'text' },
    isConfigured: { type: Boolean, default: false },
  },

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

}, { timestamps: true });

const Settings = mongoose.model('Settings', SettingsSchema);
export default Settings;