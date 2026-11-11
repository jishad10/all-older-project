import mongoose from 'mongoose';

// ─── Role Card (inside role_selection step) ───────────────────────────────────
const RoleCardSchema = new mongoose.Schema({
  key:         { type: String }, // USER | LANDLORD | AGENT
  label:       { type: String },
  description: { type: String },
}, { _id: false });

// ─── Entity Option (inside entity_type step) ──────────────────────────────────
const EntityOptionSchema = new mongoose.Schema({
  key:         { type: String }, // individual | business
  label:       { type: String },
  description: { type: String },
  features:    { type: [String], default: [] },
}, { _id: false });

// In onboarding.model.js

const FieldConfigSchema = new mongoose.Schema({
  key:         { type: String },   // matches the actual payload key e.g. "businessName"
  label:       { type: String },   // "Business Name"
  placeholder: { type: String },   // "Enter Business name"
  helperText:  { type: String },   // "Select the islands you operate in."
  required:    { type: Boolean, default: true },
  enabled:     { type: Boolean, default: true },
}, { _id: false });

const StepContentSchema = new mongoose.Schema({
  title:         { type: String, default: '' },
  subtitle:      { type: String, default: '' },
  body:          { type: String, default: '' },
  roles:         { type: [RoleCardSchema],    default: [] },
  entityOptions: { type: [EntityOptionSchema], default: [] },
  fields:        { type: [FieldConfigSchema],  default: [] }, // ← ADD THIS
}, { _id: false });

// ─── Step ─────────────────────────────────────────────────────────────────────
const StepSchema = new mongoose.Schema({
  stepNumber:  { type: Number, required: true },
  key:         { type: String, required: true },
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  enabled:     { type: Boolean, default: true },
  required:    { type: Boolean, default: true },

  // which roles see this step — empty = all roles
  visibleForRoles: { type: [String], default: [] },

  content: { type: StepContentSchema, default: () => ({}) },
}, { _id: false });

// ─── Onboarding (singleton) ───────────────────────────────────────────────────
const OnboardingSchema = new mongoose.Schema({
  singleton:   { type: Boolean, default: true, unique: true },
  steps:       { type: [StepSchema], default: [] },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

const Onboarding = mongoose.models.Onboarding || mongoose.model('Onboarding', OnboardingSchema);
export default Onboarding;
































// import mongoose from 'mongoose';

// const StepSchema = new mongoose.Schema({
//   stepNumber:  { type: Number, required: true },
//   key:         { type: String, required: true },
//   name:        { type: String, required: true },
//   description: { type: String, default: '' },
//   enabled:     { type: Boolean, default: true },
//   required:    { type: Boolean, default: true },

//   // editable content admin can change
//   content: {
//     title:    { type: String, default: '' },
//     subtitle: { type: String, default: '' },
//     body:     { type: String, default: '' },
//     // for role_selection step — editable role cards
//     roles: {
//       type: [{
//         key:         { type: String },  // USER, LANDLORD, AGENT
//         label:       { type: String },  // display name e.g. "Private Landlord"
//         description: { type: String },  // e.g. "I own properties and want to rent them out"
//       }],
//       default: [],
//     },
//   },
// }, { _id: false });

// const OnboardingSchema = new mongoose.Schema({
//   singleton:   { type: Boolean, default: true, unique: true },
//   previewRole: { type: String, enum: ['USER', 'LANDLORD', 'AGENT'], default: 'LANDLORD' },
//   steps:       { type: [StepSchema], default: [] },
//   updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
// }, { timestamps: true });

// const Onboarding = mongoose.model('Onboarding', OnboardingSchema);
// export default Onboarding;