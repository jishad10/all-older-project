import Settings from './settings.model.js';
import cloudinary, { cloudinaryUpload } from '../../lib/cloudinaryUpload.js';
import { createAuditLog } from '../auditLog/auditLog.helper.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const LEGAL_SECTIONS = ['termsOfService', 'privacyPolicy', 'licensingInformation'];

const SECTION_DEFAULTS = {
  contactSupport: {
    phoneNumbers: [], emailAddresses: [], isConfigured: false,
  },
  socialLinks: {
    facebook:     { url: '', enabled: false },
    instagram:    { url: '', enabled: false },
    tiktok:       { url: '', enabled: false },
    linkedin:     { url: '', enabled: false },
    youtube:      { url: '', enabled: false },
    isConfigured: false,
  },
  knowledgeBase:        { url: '', isConfigured: false },
  termsOfService:       { content: '', pdfUrl: '', pdfPublicId: '', inputType: 'text', isConfigured: false },
  privacyPolicy:        { content: '', pdfUrl: '', pdfPublicId: '', inputType: 'text', isConfigured: false },
  licensingInformation: { content: '', pdfUrl: '', pdfPublicId: '', inputType: 'text', isConfigured: false },
};

const VALID_SECTIONS = Object.keys(SECTION_DEFAULTS);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getOrCreate = async () => {
  let doc = await Settings.findOne({ singleton: true });
  if (!doc) doc = await Settings.create({ singleton: true });
  return doc;
};

const assertValidSection = (section) => {
  if (!VALID_SECTIONS.includes(section)) {
    const err = new Error(`Invalid section: "${section}". Valid sections are: ${VALID_SECTIONS.join(', ')}`);
    err.status = 400;
    throw err;
  }
};

const auditLog = (adminId, action, section) =>
  createAuditLog({
    actor:   { userId: adminId, email: '', role: 'ADMIN' },
    action,
    entity:  { type: 'platform_config', id: null, label: section },
    details: { section },
  });

// ─── Shared section upsert logic ──────────────────────────────────────────────

const applySectionUpdate = async (doc, section, body, files) => {
  if (section === 'contactSupport') {
    const cs = typeof body.contactSupport === 'string'
      ? JSON.parse(body.contactSupport)
      : (body.contactSupport || body);

    doc.contactSupport = {
      phoneNumbers:   cs.phoneNumbers   || [],
      emailAddresses: cs.emailAddresses || [],
      isConfigured:   !!(cs.phoneNumbers?.length || cs.emailAddresses?.length),
    };

  } else if (section === 'socialLinks') {
    const sl = typeof body.socialLinks === 'string'
      ? JSON.parse(body.socialLinks)
      : (body.socialLinks || body);

    const allowed = ['facebook', 'instagram', 'tiktok', 'linkedin', 'youtube'];
    const updated = { isConfigured: false };
    for (const p of allowed) {
      updated[p] = { url: sl[p]?.url || '', enabled: sl[p]?.enabled ?? false };
      if (updated[p].url) updated.isConfigured = true;
    }
    doc.socialLinks = updated;
    doc.markModified('socialLinks');

  } else if (section === 'knowledgeBase') {
    const kb = typeof body.knowledgeBase === 'string'
      ? JSON.parse(body.knowledgeBase)
      : (body.knowledgeBase || body);

    doc.knowledgeBase = { url: kb.url || '', isConfigured: !!kb.url };

  } else if (LEGAL_SECTIONS.includes(section)) {
    const pdfFile     = files?.[`${section}Pdf`]?.[0];
    const textContent = body[`${section}Text`] || body.content;

    if (pdfFile) {
      // Delete old PDF from Cloudinary if exists
      if (doc[section]?.pdfPublicId) {
        await cloudinary.uploader.destroy(doc[section].pdfPublicId, { resource_type: 'raw' }).catch(() => {});
      }
      const publicId = `legal-${section}-${Date.now()}`;
      const result   = await cloudinaryUpload(pdfFile.path, publicId, 'legal-docs');
      if (!result?.url) throw new Error(`PDF upload failed for ${section}`);

      doc[section] = {
        content: '', pdfUrl: result.url, pdfPublicId: result.public_id,
        inputType: 'pdf', isConfigured: true,
      };
      doc.markModified(section);

    } else if (textContent !== undefined) {
      // If switching from PDF to text, delete old PDF
      if (doc[section]?.pdfPublicId) {
        await cloudinary.uploader.destroy(doc[section].pdfPublicId, { resource_type: 'raw' }).catch(() => {});
      }
      doc[section] = {
        content: textContent, pdfUrl: '', pdfPublicId: '',
        inputType: 'text', isConfigured: !!textContent,
      };
      doc.markModified(section);
    }
  }
};

// ─── Services ─────────────────────────────────────────────────────────────────

// GET all
export const getSettingsService = async () => {
  const doc = await Settings.findOne({ singleton: true })
    .populate('updatedBy', 'firstName lastName email');
  return doc || await Settings.create({ singleton: true });
};

// GET single section
export const getSettingsSectionService = async (section) => {
  assertValidSection(section);
  const doc = await Settings.findOne({ singleton: true });
  if (!doc) return SECTION_DEFAULTS[section];
  return doc[section];
};

// PUT all — upsert entire settings doc
export const upsertSettingsService = async (adminId, body, files) => {
  const doc = await getOrCreate();

  for (const section of VALID_SECTIONS) {
    await applySectionUpdate(doc, section, body, files);
  }

  doc.updatedBy = adminId;
  await doc.save();
  await auditLog(adminId, 'config_upserted', 'all');

  return doc.populate('updatedBy', 'firstName lastName email');
};

// PUT single section — upsert one section
export const upsertSettingsSectionService = async (adminId, section, body, files) => {
  assertValidSection(section);

  const doc = await getOrCreate();
  await applySectionUpdate(doc, section, body, files);

  doc.updatedBy = adminId;
  await doc.save();
  await auditLog(adminId, 'config_upserted', section);

  return doc[section];
};

// DELETE single section — reset to defaults
export const deleteSettingsSectionService = async (adminId, section) => {
  assertValidSection(section);

  const doc = await getOrCreate();

  // Purge Cloudinary PDF if legal section
  if (LEGAL_SECTIONS.includes(section) && doc[section]?.pdfPublicId) {
    await cloudinary.uploader.destroy(doc[section].pdfPublicId, { resource_type: 'raw' }).catch(() => {});
  }

  doc[section] = SECTION_DEFAULTS[section];
  doc.markModified(section);
  doc.updatedBy = adminId;
  await doc.save();
  await auditLog(adminId, 'config_deleted', section);

  return { message: `Section "${section}" has been reset to defaults.` };
};