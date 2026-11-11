import { generateResponse } from '../../lib/responseFormate.js';
import {
  getSettingsService,
  getSettingsSectionService,
  upsertSettingsService,
  upsertSettingsSectionService,
  deleteSettingsSectionService,
} from './settings.service.js';

// GET /settings
export const getSettings = async (req, res, next) => {
  try {
    const data = await getSettingsService();
    return generateResponse(res, 200, true, 'Settings fetched', data);
  } catch (error) {
    next(error);
  }
};

// GET /settings/:section
export const getSettingsSection = async (req, res, next) => {
  try {
    const data = await getSettingsSectionService(req.params.section);
    return generateResponse(res, 200, true, 'Section fetched', data);
  } catch (error) {
    if (error.status === 400) return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};

// PUT /settings
export const upsertSettings = async (req, res, next) => {
  try {
    const data = await upsertSettingsService(req.user._id, req.body, req.files);
    return generateResponse(res, 200, true, 'Settings saved', data);
  } catch (error) {
    if (error.message.includes('PDF upload failed')) return generateResponse(res, 500, false, error.message, null);
    next(error);
  }
};

// PUT /settings/:section
export const upsertSettingsSection = async (req, res, next) => {
  try {
    const data = await upsertSettingsSectionService(req.user._id, req.params.section, req.body, req.files);
    return generateResponse(res, 200, true, 'Section saved', data);
  } catch (error) {
    if (error.status === 400)                        return generateResponse(res, 400, false, error.message, null);
    if (error.message.includes('PDF upload failed')) return generateResponse(res, 500, false, error.message, null);
    next(error);
  }
};

// DELETE /settings/:section
export const deleteSettingsSection = async (req, res, next) => {
  try {
    const data = await deleteSettingsSectionService(req.user._id, req.params.section);
    return generateResponse(res, 200, true, data.message, null);
  } catch (error) {
    if (error.status === 400) return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};