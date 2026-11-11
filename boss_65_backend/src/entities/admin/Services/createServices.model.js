import mongoose ,{ Schema } from "mongoose";


const serviceSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  
  name: { type: String, required: true }, // "Early Bird", etc.

  availableDays: [{
    type: String,
    enum: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    required: true
  }],

  timeRange: {
    start: { type: String, required: true }, //  "09:00"
    end: { type: String, required: true }    //  "12:00"
  },

  slotDurationHours: { type: Number, required: true }, // 1 for hourly, 3 for package
  pricePerSlot: { type: Number, required: true },
  maxPeopleAllowed: { type: Number, required: true },

  description: { type: String }
});


const Service = mongoose.model('Service', serviceSchema);
export default Service;
