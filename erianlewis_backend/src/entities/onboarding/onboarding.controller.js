import { generateResponse } from '../../lib/responseFormate.js';
import {
  getOnboardingService,
  updateStepContentService,
  toggleStepService,
  getOnboardingByRoleService
} from './onboarding.service.js';


// GET /onboarding              → full config (admin view)
// GET /onboarding?role=LANDLORD → filtered for that role (frontend onboarding)
export const getOnboarding = async (req, res, next) => {
  try {
    const { role } = req.query;
    const data = role
      ? await getOnboardingByRoleService(role)
      : await getOnboardingService();
    return generateResponse(res, 200, true, 'Onboarding config fetched', data);
  } catch (error) {
    next(error);
  }
};

// PUT /onboarding/steps/:stepKey/content  (admin)
export const updateStepContent = async (req, res, next) => {
  try {
    const { stepKey } = req.params;
    const { title, subtitle, body, roles, entityOptions, fields } = req.body;
    const data = await updateStepContentService(req.user._id, stepKey, {
      title, subtitle, body, roles, entityOptions, fields,
    });
    return generateResponse(res, 200, true, 'Step content updated', data);
  } catch (error) {
    if (error.message === 'Step not found')
      return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};

// PATCH /onboarding/steps/:stepKey/toggle  (admin)
export const toggleStep = async (req, res, next) => {
  try {
    const { stepKey } = req.params;
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean')
      return generateResponse(res, 400, false, '`enabled` must be a boolean', null);

    const data = await toggleStepService(req.user._id, stepKey, enabled);
    return generateResponse(res, 200, true, `Step ${enabled ? 'enabled' : 'disabled'}`, data);
  } catch (error) {
    if (error.message === 'Step not found')
      return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};
















// import { generateResponse } from '../../lib/responseFormate.js';
// import {
//   getOnboardingService,
//   updateStepConfigService,
//   updateStepContentService,
//   updatePreviewRoleService,
//   resetOnboardingService,
// } from './onboarding.service.js';


// // GET — public (frontend reads during registration)
// export const getOnboarding = async (req, res, next) => {
//   try {
//     const data = await getOnboardingService();
//     return generateResponse(res, 200, true, 'Onboarding config fetched', data);
//   } catch (error) { next(error); }
// };


// // PUT — update step enabled/required (admin)
// export const updateStepConfig = async (req, res, next) => {
//   try {
//     const { stepKey } = req.params;
//     const { enabled, required } = req.body;
//     const data = await updateStepConfigService(req.user._id, stepKey, { enabled, required });
//     return generateResponse(res, 200, true, 'Step config updated', data);
//   } catch (error) {
//     if (error.message === 'Step not found')               return generateResponse(res, 404, false, error.message, null);
//     if (error.message === 'This step cannot be modified') return generateResponse(res, 400, false, error.message, null);
//     next(error);
//   }
// };


// // PUT — edit step content/text (admin)
// export const updateStepContent = async (req, res, next) => {
//   try {
//     const { stepKey } = req.params;
//     const { title, subtitle, body, roles } = req.body;
//     const data = await updateStepContentService(req.user._id, stepKey, { title, subtitle, body, roles });
//     return generateResponse(res, 200, true, 'Step content updated', data);
//   } catch (error) {
//     if (error.message === 'Step not found') return generateResponse(res, 404, false, error.message, null);
//     next(error);
//   }
// };


// // PUT — change preview role (admin)
// export const updatePreviewRole = async (req, res, next) => {
//   try {
//     const { previewRole } = req.body;
//     const data = await updatePreviewRoleService(req.user._id, previewRole);
//     return generateResponse(res, 200, true, 'Preview role updated', data);
//   } catch (error) {
//     if (error.message === 'Invalid preview role') return generateResponse(res, 400, false, error.message, null);
//     next(error);
//   }
// };


// // POST — reset all steps to default (admin)
// export const resetOnboarding = async (req, res, next) => {
//   try {
//     const data = await resetOnboardingService(req.user._id);
//     return generateResponse(res, 200, true, 'Onboarding reset to defaults', data);
//   } catch (error) { next(error); }
// };