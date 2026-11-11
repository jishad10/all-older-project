// src/modules/contact/contact.service.js
import Contact from './contact.model.js';

const isNonEmptyString = (val) => typeof val === 'string' && val.trim().length > 0;

const parsePagination = (page, limit) => {
  const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 10;
  return { page: safePage, limit: safeLimit };
};

export const createContactService = async ({ name, email, phone, message, consent = false }) => {
  if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(message)) {
    const err = new Error('Name, email, and message are required');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  return Contact.create({
    name: name.trim(),
    email: email.trim(),
    phone: isNonEmptyString(phone) ? phone.trim() : '',
    message: message.trim(),
    consent: Boolean(consent),
  });
};

export const getContactsService = async ({ page = 1, limit = 10, search }) => {
  const { page: safePage, limit: safeLimit } = parsePagination(page, limit);

  const filter = {};
  if (isNonEmptyString(search)) {
    filter.$or = [
      { name: { $regex: search.trim(), $options: 'i' } },
      { email: { $regex: search.trim(), $options: 'i' } },
      { phone: { $regex: search.trim(), $options: 'i' } },
      { message: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const [total, contacts] = await Promise.all([
    Contact.countDocuments(filter),
    Contact.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
  ]);

  return {
    data: contacts,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

export const getContactByIdService = async (id) => {
  return Contact.findById(id);
};

export const updateContactService = async (id, data) => {
  const allowed = ['name', 'email', 'phone', 'message', 'consent'];
  const updates = {};

  for (const field of allowed) {
    if (data[field] !== undefined) {
      if (['name', 'email', 'message'].includes(field) && !isNonEmptyString(data[field])) {
        const err = new Error(`${field} cannot be empty`);
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      updates[field] = data[field];
    }
  }

  const updated = await Contact.findByIdAndUpdate(id, { $set: updates }, { new: true });
  if (!updated) return { notFound: true };
  return { contact: updated };
};

export const deleteContactService = async (id) => {
  const result = await Contact.findByIdAndDelete(id);
  if (!result) return { notFound: true };
  return { deleted: true };
};