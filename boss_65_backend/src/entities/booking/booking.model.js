import mongoose, { Schema } from 'mongoose';

const bookingSchema = new Schema({
    user: {
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true },
        phone: { type: String, required: true, trim: true },
        numberOfPeople: { type: Number, required: true, min: 1 }
    },
    room: {
        type: Schema.Types.ObjectId,
        ref: "Room",
        required: true
    },
    promoCode: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PromoCode',
        default: null
    },
    date: {
        type: Date,
        required: true
    },
    timeSlots: [
        {
            start: { type: String, required: true },
            end: { type: String, required: true }
        }
    ],
    service: {
        type: Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled','refunded'],
        default: 'pending'
    },
    stripeSessionId: {
        type: String,
        default: null,
    },
    refundId: {
        type: String,
        default: null
    },
    refundedAt: {
        type: Date,
        default: null,
    },
    paymentIntentId:{ String},
    expiresAt: {
        type: Date,
        default: null,
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending',
    },
    freeSlotsAwarded: { type: Number, default: 0 },
    isManualBooking: { type: Boolean, default: false }
}, 
{
    timestamps: true
});


export default mongoose.model("Booking", bookingSchema);
