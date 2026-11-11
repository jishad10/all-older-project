import Onboarding from './onboarding.model.js';

// ─── Default Steps ────────────────────────────────────────────────────────────
const DEFAULT_STEPS = [
{
  stepNumber: 1,
  key: 'personal_information',
  name: 'Personal Information',
  description: 'Basic user details — same for all roles',
  enabled: true,
  required: true,
  visibleForRoles: [],
  content: {
    title: 'Tell us about yourself',
    subtitle: 'Fill in your basic details to get started',
    body: '',
    fields: [
      {
        key: 'firstName',
        label: 'First Name',
        placeholder: 'Enter your first name',
        helperText: '',
        required: true,
        enabled: true,
      },
      {
        key: 'lastName',
        label: 'Last Name',
        placeholder: 'Enter your last name',
        helperText: '',
        required: true,
        enabled: true,
      },
      {
        key: 'phone',
        label: 'Phone Number',
        placeholder: 'Enter your phone number',
        helperText: '',
        required: false,
        enabled: true,
      },
      {
        key: 'email',
        label: 'Email Address',
        placeholder: 'Enter your email',
        helperText: '',
        required: true,
        enabled: true,
      },
      {
        key: 'password',
        label: 'Password',
        placeholder: 'Enter your password',
        helperText: '',
        required: true,
        enabled: true,
      },
      {
        key: 'confirmPassword',
        label: 'Confirm Password',
        placeholder: 'Re-enter your password',
        helperText: '',
        required: true,
        enabled: true,
      },
    ],
  },
},
  {
    stepNumber: 2,
    key: 'role_selection',
    name: 'Role Selection',
    description: 'Choose how the user plans to use the platform',
    enabled: true,
    required: true,
    visibleForRoles: [], // all roles
    content: {
      title: 'Choose Your Plan',
      subtitle: 'How do you plan to use Alora?',
      body: '',
      roles: [
        {
          key: 'USER',
          label: 'Tenant',
          description: 'I am looking to rent or buy a property',
        },
        {
          key: 'LANDLORD',
          label: 'Private Landlord',
          description: 'I own properties and want to rent them out',
        },
        {
          key: 'AGENT',
          label: 'Real Estate Agent',
          description: 'I represent properties for sale or rent',
        },
      ],
    },
  },
  // Step 3 — entity_type (add fields for individual form)
{
  stepNumber: 3,
  key: 'entity_type',
  name: 'Entity Type',
  description: 'Individual or business selection — LANDLORD & AGENT only',
  enabled: true,
  required: true,
  visibleForRoles: ['LANDLORD', 'AGENT'],
  content: {
    title: 'Choose Your Entity Type',
    subtitle: "Select whether you're listing as an individual or business",
    body: '',
    entityOptions: [
      {
        key: 'individual',
        label: 'Individual',
        description: "I'm listing as an individual owner",
        features: [
          'Up to 3 properties on free plan',
          'Personal property management',
          'Simple listing process',
        ],
      },
      {
        key: 'business',
        label: 'Business',
        description: "I'm listing properties as a business entity",
        features: [
          'Up to 5 properties on free plan',
          'Business property portfolio',
          'Professional management',
        ],
      },
    ],
    // Individual sub-form fields (shown after selecting individual)
    fields: [
      {
        key: 'operatingLocations',
        label: 'Operating Location(s)',
        placeholder: 'Select island',
        helperText: 'Select the islands you operate in.',
        required: true,
        enabled: true,
      },
      {
        key: 'numberOfProperties',
        label: 'Number of Properties',
        placeholder: 'e.g., 3',
        helperText: 'We use this to recommend the right subscription.',
        required: true,
        enabled: true,
      },
    ],
  },
},

// Step 4 — business_profile
{
  stepNumber: 4,
  key: 'business_profile',
  name: 'Business Profile',
  description: 'Business details — shown when entity type is business',
  enabled: true,
  required: true,
  visibleForRoles: ['LANDLORD', 'AGENT'],
  content: {
    title: 'Business Profile',
    subtitle: 'Tell us a bit about your business so we can set up your account',
    body: '',
    fields: [
      {
        key: 'businessName',
        label: 'Business Name',
        placeholder: 'Enter Business name',
        helperText: '',
        required: true,
        enabled: true,
      },
      {
        key: 'aboutBusiness',
        label: 'About Your Business',
        placeholder: 'What should clients know about your business?',
        helperText: '',
        required: true,
        enabled: true,
      },
      {
        key: 'operatingLocations',
        label: 'Operating Location(s)',
        placeholder: 'Select island',
        helperText: 'Select the islands you operate in.',
        required: true,
        enabled: true,
      },
      {
        key: 'numberOfProperties',
        label: 'Number of Properties',
        placeholder: 'e.g., 5',
        helperText: 'We use this to recommend the right subscription.',
        required: true,
        enabled: true,
      },
    ],
  },
},
// Step 5 — plan_selection
{
  stepNumber: 5,
  key: 'plan_selection',
  name: 'Plan Selection',
  description: 'Subscription plan — LANDLORD & AGENT only',
  enabled: true,
  required: true,
  visibleForRoles: ['LANDLORD', 'AGENT'],
  content: {
    title: 'Subscription',
    subtitle: 'Pick a plan for your account',
    body: 'Adjust the number of properties to see the recommended plan.',
    fields: [
      {
        key: 'numberOfProperties',
        label: 'Number of properties',
        placeholder: '1',
        helperText: 'Adjust if needed to see the recommended plan.',
        required: true,
        enabled: true,
      },
    ],
  },
},
  {
    stepNumber: 6,
    key: 'completion',
    name: 'Completion',
    description: 'Final onboarding step',
    enabled: true,
    required: true,
    visibleForRoles: [], // all roles
    content: {
      title: "You're all set!",
      subtitle: 'Your account is ready',
      body: 'Welcome aboard. You can now start exploring the platform.',
    },
  },
];


// ─── Helpers ──────────────────────────────────────────────────────────────────
const getOrCreate = async () => {
  let doc = await Onboarding.findOne({ singleton: true });
  if (!doc) {
    doc = await Onboarding.create({ singleton: true, steps: DEFAULT_STEPS });
  }
  return doc;
};

// ─── Public: get full onboarding config ───────────────────────────────────────
export const getOnboardingService = async () => {
  const doc = await getOrCreate();
  return doc.populate('updatedBy', 'firstName lastName email');
};

/**
 * Get onboarding steps filtered by role.
 * Frontend can call GET /onboarding?role=LANDLORD to get only relevant steps.
 *
 * Step visibility logic:
 *   - visibleForRoles = []        → show for ALL roles
 *   - visibleForRoles = ['X','Y'] → show only for those roles
 *
 * Extra rule: entity_type step for AGENT always hides 'individual' option.
 */
export const getOnboardingByRoleService = async (role) => {
  const doc = await getOrCreate();
  await doc.populate('updatedBy', 'firstName lastName email');

  if (!role) return doc;

  const filteredSteps = doc.steps
    .filter((s) => {
      if (!s.enabled) return false;
      if (!s.visibleForRoles || s.visibleForRoles.length === 0) return true;
      return s.visibleForRoles.includes(role.toUpperCase());
    })
    .map((s) => {
      const step = s.toObject();

      // AGENT: entity_type step — remove 'individual' option, only business allowed
      if (
        step.key === 'entity_type' &&
        role.toUpperCase() === 'AGENT' &&
        step.content?.entityOptions
      ) {
        step.content.entityOptions = step.content.entityOptions.filter(
          (o) => o.key === 'business'
        );
      }

      return step;
    });

  return { ...doc.toObject(), steps: filteredSteps };
};

// ─── Admin: update step content ───────────────────────────────────────────────
// In onboarding.service.js — updateStepContentService
export const updateStepContentService = async (
  adminId,
  stepKey,
  { title, subtitle, body, roles, entityOptions, fields }
) => {
  const doc = await getOrCreate();
  const step = doc.steps.find((s) => s.key === stepKey);
  if (!step) throw new Error('Step not found');

  if (!step.content) step.content = {};
  if (title    !== undefined) step.content.title    = title;
  if (subtitle !== undefined) step.content.subtitle = subtitle;
  if (body     !== undefined) step.content.body     = body;

  if (roles !== undefined && stepKey === 'role_selection') {
    step.content.roles = roles;
  }
  if (entityOptions !== undefined && stepKey === 'entity_type') {
    step.content.entityOptions = entityOptions;
  }

  // Admin can update field labels, placeholders, helperText, required, enabled
  // but CANNOT add/remove fields (keys are fixed)
  if (fields !== undefined) {
    fields.forEach((incoming) => {
      const existing = step.content.fields.find((f) => f.key === incoming.key);
      if (existing) {
        if (incoming.label       !== undefined) existing.label       = incoming.label;
        if (incoming.placeholder !== undefined) existing.placeholder = incoming.placeholder;
        if (incoming.helperText  !== undefined) existing.helperText  = incoming.helperText;
        if (incoming.required    !== undefined) existing.required    = incoming.required;
        if (incoming.enabled     !== undefined) existing.enabled     = incoming.enabled;
      }
      // unknown keys are ignored — admin cannot inject new fields
    });
  }

  doc.updatedBy = adminId;
  doc.markModified('steps');
  await doc.save();
  return doc.populate('updatedBy', 'firstName lastName email');
};

// ─── Admin: toggle step enabled/disabled ─────────────────────────────────────
export const toggleStepService = async (adminId, stepKey, enabled) => {
  const doc = await getOrCreate();
  const step = doc.steps.find((s) => s.key === stepKey);
  if (!step) throw new Error('Step not found');

  step.enabled = enabled;
  doc.updatedBy = adminId;
  doc.markModified('steps');
  await doc.save();
  return doc.populate('updatedBy', 'firstName lastName email');
};






















// import Onboarding from './onboarding.model.js';

// const DEFAULT_STEPS = [
//   {
//     stepNumber: 1, key: 'role_selection', name: 'Role Selection',
//     description: 'Choose a User Role', enabled: true, required: true,
//     content: {
//       title: 'Choose Your Plan', subtitle: 'How do you plan to use Alora?', body: '',
//       roles: [
//         { key: 'USER',     label: 'Tenant',           description: 'I am looking to rent or buy a property' },
//         { key: 'LANDLORD', label: 'Private Landlord',  description: 'I own properties and want to rent them out' },
//         { key: 'AGENT',    label: 'Real Estate Agent', description: 'I represent properties for sale or rent' },
//       ],
//     },
//   },
//   {
//     stepNumber: 2, key: 'personal_information', name: 'Personal Information',
//     description: 'Collect basic user details', enabled: true, required: false,
//     content: { title: 'Tell us about yourself', subtitle: 'Fill in your basic details', body: '' },
//   },
//   {
//     stepNumber: 3, key: 'identity_verification', name: 'Identity Verification',
//     description: 'Select entity type (individual/business)', enabled: false, required: false,
//     content: { title: 'Verify your identity', subtitle: 'Select your entity type', body: '' },
//   },
//   {
//     stepNumber: 4, key: 'business_profile', name: 'Business Profile',
//     description: 'Business details for agents and business landlords', enabled: true, required: true,
//     content: { title: 'Business Profile', subtitle: 'Tell us a bit about your business so we can set up your account', body: '' },
//   },
//   {
//     stepNumber: 5, key: 'plan_selection', name: 'Plan Selection',
//     description: 'Pick a subscription plan', enabled: true, required: true,
//     content: { title: 'Subscription', subtitle: 'Pick a plan for your landlord account', body: 'Adjust the number of properties to see the recommended plan.' },
//   },
//   {
//     stepNumber: 6, key: 'first_property_listing', name: 'First Property Listing',
//     description: 'Guide user to add their first listing', enabled: true, required: true,
//     content: { title: 'First Property Listing', subtitle: 'We\'ll guide you through this in your dashboard', body: 'You can add your first property after completing onboarding.' },
//   },
//   {
//     stepNumber: 7, key: 'completion', name: 'Completion',
//     description: 'Finish onboarding', enabled: true, required: true,
//     content: { title: 'You\'re all set!', subtitle: 'Your account is ready', body: 'Welcome aboard. You can now start managing your properties.' },
//   },
// ];

// const LOCKED_STEPS = ['role_selection', 'completion'];

// const getOrCreate = async () => {
//   let doc = await Onboarding.findOne({ singleton: true });
//   if (!doc) doc = await Onboarding.create({ singleton: true, steps: DEFAULT_STEPS });
//   return doc;
// };


// // ─── GET ─────────────────────────────────────

// export const getOnboardingService = async () => {
//   const doc = await (await getOrCreate()).populate('updatedBy', 'firstName lastName email');
//   return doc;
// };


// // ─── UPDATE STEP CONFIG (enabled/required) ───

// export const updateStepConfigService = async (adminId, stepKey, { enabled, required }) => {
//   const doc = await getOrCreate();

//   if (LOCKED_STEPS.includes(stepKey)) throw new Error('This step cannot be modified');

//   const step = doc.steps.find(s => s.key === stepKey);
//   if (!step) throw new Error('Step not found');

//   if (enabled  !== undefined) step.enabled  = enabled;
//   if (required !== undefined) step.required = required;

//   doc.updatedBy = adminId;
//   doc.markModified('steps');
//   await doc.save();
//   return doc.populate('updatedBy', 'firstName lastName email');
// };


// // ─── UPDATE STEP CONTENT (title/subtitle/body) ──

// export const updateStepContentService = async (adminId, stepKey, { title, subtitle, body, roles }) => {
//   const doc = await getOrCreate();

//   const step = doc.steps.find(s => s.key === stepKey);
//   if (!step) throw new Error('Step not found');

//   if (!step.content) step.content = {};
//   if (title    !== undefined) step.content.title    = title;
//   if (subtitle !== undefined) step.content.subtitle = subtitle;
//   if (body     !== undefined) step.content.body     = body;

//   // only role_selection step has roles
//   if (roles !== undefined && stepKey === 'role_selection') {
//     step.content.roles = roles;
//   }

//   doc.updatedBy = adminId;
//   doc.markModified('steps');
//   await doc.save();
//   return doc.populate('updatedBy', 'firstName lastName email');
// };


// // ─── UPDATE PREVIEW ROLE ─────────────────────

// export const updatePreviewRoleService = async (adminId, previewRole) => {
//   const validRoles = ['USER', 'LANDLORD', 'AGENT'];
//   if (!validRoles.includes(previewRole)) throw new Error('Invalid preview role');

//   const doc = await getOrCreate();
//   doc.previewRole = previewRole;
//   doc.updatedBy   = adminId;
//   await doc.save();
//   return doc.populate('updatedBy', 'firstName lastName email');
// };


// // ─── RESET TO DEFAULTS ───────────────────────

// export const resetOnboardingService = async (adminId) => {
//   const doc = await getOrCreate();
//   doc.steps     = DEFAULT_STEPS;
//   doc.updatedBy = adminId;
//   doc.markModified('steps');
//   await doc.save();
//   return doc.populate('updatedBy', 'firstName lastName email');
// };