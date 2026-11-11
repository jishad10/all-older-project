import mongoose from 'mongoose';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Single time slot e.g. { start: "09:00", end: "10:00" }
const TimeSlotSchema = new mongoose.Schema({
  start: { type: String, required: true }, // "09:00"
  end:   { type: String, required: true }, // "10:00"
}, { _id: false });


// Weekly availability — one doc per landlord/agent
const AvailabilitySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  schedule: {
    sunday:    { type: [TimeSlotSchema], default: [] },
    monday:    { type: [TimeSlotSchema], default: [] },
    tuesday:   { type: [TimeSlotSchema], default: [] },
    wednesday: { type: [TimeSlotSchema], default: [] },
    thursday:  { type: [TimeSlotSchema], default: [] },
    friday:    { type: [TimeSlotSchema], default: [] },
    saturday:  { type: [TimeSlotSchema], default: [] },
  },
}, { timestamps: true });

export const Availability = mongoose.model('Availability', AvailabilitySchema);



const BlockedDateSchema = new mongoose.Schema({
  owner:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:   { type: Date, required: true },
  reason: { type: String, default: '' },
}, { timestamps: true });

export const BlockedDate = mongoose.model('BlockedDate', BlockedDateSchema);


const AppointmentSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'RentalProperty', required: true },
  owner:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // landlord/agent


  bookedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  customerName: { type: String, required: true },
  email:        { type: String, required: true },
  phone:        { type: String, required: true },

  date:  { type: Date,   required: true },
  time:  { type: String, required: true }, // "09:00"
  notes: { type: String, default: '' },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending',
  },
}, { timestamps: true });

const Appointment = mongoose.model('Appointment', AppointmentSchema);
export default Appointment;