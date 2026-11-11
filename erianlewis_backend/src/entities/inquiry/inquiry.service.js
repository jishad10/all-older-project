import Inquiry from './inquiry.model.js';
import RentalProperty from '../rentalProperty/rentalProperty.model.js';
import User from '../auth/auth.model.js';
import Settings from '../settings/settings.model.js';
import sendEmail from '../../lib/sendEmail.js';
import { getOwnerReplyTemplate } from '../../lib/emailTemplates.js';
import { createPaginationInfo } from '../../lib/pagination.js';
import { checkIfCaribbean } from '../../lib/ipLocation.js';

// ─────────────────────────────────────────────
// PUBLIC — Submit inquiry
// ─────────────────────────────────────────────

export const createInquiryService = async (payload, sentBy = null, ip = null) => {
  const { propertyId, fullName, email, phone, message } = payload;

  if (!propertyId) throw new Error('Property is required');
  if (!fullName)   throw new Error('Full name is required');
  if (!email)      throw new Error('Email is required');
  if (!message)    throw new Error('Message is required');

  const property = await RentalProperty.findById(propertyId).populate('address.island', 'name');
  if (!property) throw new Error('Property not found');

  const landlordId = property.createdBy;
  if (!landlordId) throw new Error('Property has no owner assigned');

  const landlord = await User.findById(landlordId).select('firstName lastName email');
  if (!landlord) throw new Error('Landlord not found');

  // ── IP check — is the inquirer from the Caribbean? ──────────────────────
  const location = await checkIfCaribbean(ip);
  const isInternational = !location.isCaribbean;

  const inquiry = await Inquiry.create({
    property:            propertyId,
    landlord:            landlordId,
    sentBy:              sentBy || null,
    fullName,
    email,
    phone:               phone || '',
    message,
    isInternational,
    inquirerCountry:     location.country,
    inquirerCountryCode: location.countryCode,
  });

  // ── Route email based on location ───────────────────────────────────────
  if (isInternational) {
    // International inquiry — send to admin/broker
    const settings = await Settings.findOne({ singleton: true });
    const adminEmails = [...(settings?.contactSupport?.emailAddresses || [])];

    // Fallback to ADMIN users if no emails configured in settings
    if (adminEmails.length === 0) {
      const admins = await User.find({ role: 'ADMIN' }).select('email');
      admins.forEach(a => adminEmails.push(a.email));
    }

    for (const adminEmail of adminEmails) {
      sendEmail({
        to: adminEmail,
        subject: `🌍 International Inquiry from ${location.country} — ${property.basicInformation?.propertyTitle || 'Property'}`,
        html: `
          <h2>International Inquiry Received</h2>
          <p><strong>From:</strong> ${fullName} (${email})</p>
          <p><strong>Country:</strong> ${location.country} (${location.countryCode})</p>
          <p><strong>Property:</strong> ${property.basicInformation?.propertyTitle || 'N/A'}</p>
          <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
          <hr/>
          <p><em>This inquiry was routed to you because the user is outside the Caribbean.</em></p>
        `,
      }).catch(err => console.error('International inquiry email error:', err.message));
    }
  }

  return inquiry;
};

// ─────────────────────────────────────────────
// LANDLORD / AGENT — View & reply to inquiries
// ─────────────────────────────────────────────

export const getLandlordInquiriesService = async (
  landlordId,
  { page = 1, limit = 10, status, propertyId }
) => {
  const numericPage = Number(page) || 1;
  const numericLimit = Number(limit) || 10;

  const filter = { landlord: landlordId };
  if (status) filter.status = status;
  if (propertyId) filter.property = propertyId;

  const total = await Inquiry.countDocuments(filter);

  const inquiries = await Inquiry.find(filter)
    .populate('property', 'basicInformation.propertyTitle location.island photos listingType')
    .populate('sentBy', 'firstName lastName email profileImage')
    .populate('replies.repliedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .skip((numericPage - 1) * numericLimit)
    .limit(numericLimit);

  const [allCount, newCount, readCount, repliedCount] = await Promise.all([
    Inquiry.countDocuments({ landlord: landlordId }),
    Inquiry.countDocuments({ landlord: landlordId, status: 'new' }),
    Inquiry.countDocuments({ landlord: landlordId, status: 'read' }),
    Inquiry.countDocuments({ landlord: landlordId, status: 'replied' })
  ]);

  return {
    counts: { all: allCount, new: newCount, read: readCount, replied: repliedCount },
    inquiries,
    paginationInfo: createPaginationInfo(numericPage, numericLimit, total)
  };
};

export const getLandlordInquiryByIdService = async (landlordId, inquiryId) => {
  const inquiry = await Inquiry.findOne({ _id: inquiryId, landlord: landlordId })
    .populate('property', 'basicInformation location photos listingType')
    .populate('sentBy', 'firstName lastName email profileImage')
    .populate('replies.repliedBy', 'firstName lastName email');

  if (!inquiry) throw new Error('Inquiry not found');
  return inquiry;
};

export const replyToInquiryService = async (landlordId, inquiryId, message, isAdmin = false) => {
  if (!message) throw new Error('Reply message is required');

  const query = isAdmin
    ? { _id: inquiryId }
    : { _id: inquiryId, landlord: landlordId };

  const inquiry = await Inquiry.findOne(query)
    .populate('property', 'basicInformation.propertyTitle')
    .populate('landlord', 'firstName lastName');

  if (!inquiry) throw new Error('Inquiry not found');

  inquiry.replies.push({ message, repliedBy: landlordId });
  inquiry.status = 'replied';
  await inquiry.save();

  const propertyTitle = inquiry.property?.basicInformation?.propertyTitle || 'Property';
  const ownerName = `${inquiry.landlord.firstName} ${inquiry.landlord.lastName}`;

  sendEmail({
    to: inquiry.email,
    subject: `Reply from landlord regarding ${propertyTitle}`,
    html: getOwnerReplyTemplate({
      senderName: inquiry.fullName,
      ownerName,
      propertyTitle,
      replyMessage: message,
      originalMessage: inquiry.message
    })
  }).catch(err => console.error('Inquiry reply email error:', err.message));

  return inquiry;
};

export const updateInquiryStatusService = async (landlordId, inquiryId, status) => {
  const validStatuses = ['new', 'read', 'replied', 'closed'];
  if (!validStatuses.includes(status)) throw new Error('Invalid status');

  const inquiry = await Inquiry.findOne({ _id: inquiryId, landlord: landlordId });
  if (!inquiry) throw new Error('Inquiry not found');

  inquiry.status = status;
  await inquiry.save();
  return inquiry;
};

// ─────────────────────────────────────────────
// ADMIN — All inquiries + internal notes
// ─────────────────────────────────────────────

export const adminGetAllInquiriesService = async ({ page = 1, limit = 10, status, propertyId, landlordId }) => {
  const numericPage = Number(page) || 1;
  const numericLimit = Number(limit) || 10;

  const filter = {};
  if (status)     filter.status   = status;
  if (propertyId) filter.property = propertyId;
  if (landlordId) filter.landlord = landlordId;

  const total = await Inquiry.countDocuments(filter);

  const inquiries = await Inquiry.find(filter)
    .populate('property', 'basicInformation.propertyTitle location.island listingType')
    .populate('landlord', 'firstName lastName email role')
    .populate('sentBy', 'firstName lastName email')
    .populate('replies.repliedBy', 'firstName lastName')
    .populate('adminNotes.addedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .skip((numericPage - 1) * numericLimit)
    .limit(numericLimit);

  return { inquiries, paginationInfo: createPaginationInfo(numericPage, numericLimit, total) };
};

export const adminGetInquiryByIdService = async (inquiryId) => {
  const inquiry = await Inquiry.findById(inquiryId)
    .populate('property', 'basicInformation location photos listingType')
    .populate('landlord', 'firstName lastName email role profileImage')
    .populate('sentBy', 'firstName lastName email profileImage')
    .populate('replies.repliedBy', 'firstName lastName email')
    .populate('adminNotes.addedBy', 'firstName lastName email');

  if (!inquiry) throw new Error('Inquiry not found');
  return inquiry;
};

export const addAdminNoteService = async (adminId, inquiryId, note) => {
  if (!note) throw new Error('Note is required');

  const inquiry = await Inquiry.findById(inquiryId);
  if (!inquiry) throw new Error('Inquiry not found');

  inquiry.adminNotes.push({ note, addedBy: adminId });
  await inquiry.save();

  return inquiry.adminNotes[inquiry.adminNotes.length - 1];
};

export const deleteAdminNoteService = async (adminId, inquiryId, noteId) => {
  const inquiry = await Inquiry.findById(inquiryId);
  if (!inquiry) throw new Error('Inquiry not found');

  const noteIndex = inquiry.adminNotes.findIndex(
    (n) => n._id.toString() === noteId && n.addedBy.toString() === adminId.toString()
  );
  if (noteIndex === -1) throw new Error('Note not found');

  inquiry.adminNotes.splice(noteIndex, 1);
  await inquiry.save();
  return true;
};

export const adminDeleteInquiryService = async (inquiryId) => {
  const inquiry = await Inquiry.findById(inquiryId);
  if (!inquiry) throw new Error('Inquiry not found');
  await Inquiry.findByIdAndDelete(inquiryId);
  return true;
};