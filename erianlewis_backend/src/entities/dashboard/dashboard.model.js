import mongoose from 'mongoose';

// Single doc — tracks total site visits
const SiteStatsSchema = new mongoose.Schema({
  singleton:    { type: Boolean, default: true, unique: true },
  totalVisits:  { type: Number, default: 0 },
}, { timestamps: true });

const SiteStats = mongoose.model('SiteStats', SiteStatsSchema);
export default SiteStats;