import Inquiry from '../inquiry/inquiry.model.js';
import Appointment from '../appointment/appointment.model.js';
import RentalProperty from '../rentalProperty/rentalProperty.model.js';
import { createPaginationInfo } from '../../lib/pagination.js';


// Get property ids by island
const getPropertyIdsByIsland = async (island) => {
  return RentalProperty.find({ 'address.island': island }).distinct('_id');
};


export const getCommunicationLogsService = async ({ page = 1, limit = 10, search, type, startDate, endDate, island }) => {
  const numericPage  = Number(page)  || 1;
  const numericLimit = Number(limit) || 10;

  const logs = [];

  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate)   dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));

  // get property ids for island filter
  let islandPropertyIds = null;
  if (island) {
    islandPropertyIds = await getPropertyIdsByIsland(island);
  }

  // ─── INQUIRIES ──────────────────────────────
  if (!type || type === 'inquiry' || type === 'inquiry_response') {
    const inquiryFilter = {};
    if (Object.keys(dateFilter).length) inquiryFilter.createdAt = dateFilter;
    if (islandPropertyIds) inquiryFilter.property = { $in: islandPropertyIds };

    if (search) {
      inquiryFilter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email:    { $regex: search, $options: 'i' } },
      ];
    }

    const inquiries = await Inquiry.find(inquiryFilter)
      .populate('property', 'basicInformation.propertyTitle address.island')
      .populate('landlord', 'firstName lastName email')
      .populate('sentBy',   'firstName lastName email')
      .sort({ createdAt: -1 });

    for (const inq of inquiries) {
      if (!type || type === 'inquiry') {
        logs.push({
          _id:      inq._id,
          when:     inq.createdAt,
          type:     'inquiry',
          who:      { name: inq.fullName, email: inq.email },
          owner:    inq.landlord,
          property: inq.property,
          subject:  `Inquiry — ${inq.property?.basicInformation?.propertyTitle || 'Property'}`,
          message:  inq.message,
          status:   inq.status,
          ref:      inq._id,
          refModel: 'Inquiry',
        });
      }

      if (!type || type === 'inquiry_response') {
        for (const reply of inq.replies || []) {
          logs.push({
            _id:      reply._id,
            when:     reply.repliedAt,
            type:     'inquiry_response',
            who:      inq.landlord,
            owner:    inq.landlord,
            property: inq.property,
            subject:  `Reply — ${inq.property?.basicInformation?.propertyTitle || 'Property'}`,
            message:  reply.message,
            status:   'replied',
            ref:      inq._id,
            refModel: 'Inquiry',
          });
        }
      }
    }
  }

  // ─── APPOINTMENTS ────────────────────────────
  if (!type || type === 'appointment') {
    const apptFilter = {};
    if (Object.keys(dateFilter).length) apptFilter.createdAt = dateFilter;
    if (islandPropertyIds) apptFilter.property = { $in: islandPropertyIds };

    if (search) {
      apptFilter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { email:        { $regex: search, $options: 'i' } },
        { phone:        { $regex: search, $options: 'i' } },
      ];
    }

    const appointments = await Appointment.find(apptFilter)
      .populate('property', 'basicInformation.propertyTitle address.island')
      .populate('owner',    'firstName lastName email')
      .populate('bookedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    for (const appt of appointments) {
      logs.push({
        _id:      appt._id,
        when:     appt.createdAt,
        type:     'appointment',
        who:      { name: appt.customerName, email: appt.email, phone: appt.phone },
        owner:    appt.owner,
        property: appt.property,
        subject:  `Appointment — ${appt.property?.basicInformation?.propertyTitle || 'Property'}`,
        message:  appt.notes || '',
        date:     appt.date,
        time:     appt.time,
        status:   appt.status,
        ref:      appt._id,
        refModel: 'Appointment',
      });
    }
  }

  // sort all by date desc
  logs.sort((a, b) => new Date(b.when) - new Date(a.when));

  const total     = logs.length;
  const paginated = logs.slice((numericPage - 1) * numericLimit, numericPage * numericLimit);

  return { logs: paginated, paginationInfo: createPaginationInfo(numericPage, numericLimit, total) };
};
