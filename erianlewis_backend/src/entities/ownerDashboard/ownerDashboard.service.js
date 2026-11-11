import RentalProperty from "../rentalProperty/rentalProperty.model.js";
import Appointment from "../appointment/appointment.model.js";

// Stats for a landlord/agent dashboard
export const getOwnerDashboardStatsService = async (ownerId) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfRange = new Date(startOfToday);
  endOfRange.setDate(endOfRange.getDate() + 7);

  const [totalProperties, activeListings, viewsAgg, pendingAppointments, weeklyAgg] =
    await Promise.all([
      RentalProperty.countDocuments({ createdBy: ownerId }),
      RentalProperty.countDocuments({ createdBy: ownerId, status: "active" }),
      RentalProperty.aggregate([
        { $match: { createdBy: ownerId } },
        { $group: { _id: null, total: { $sum: "$views" } } },
      ]),
      Appointment.countDocuments({ owner: ownerId, status: "pending" }),
      Appointment.aggregate([
        { $match: { owner: ownerId, date: { $gte: startOfToday, $lt: endOfRange } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

  const totalViews = viewsAgg?.[0]?.total || 0;

  // Build a 7-day window with zeros filled
  const weeklyAppointments = [];
  const weeklyMap = new Map(weeklyAgg.map((d) => [d._id, d.count]));
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    weeklyAppointments.push({ date: key, count: weeklyMap.get(key) || 0 });
  }

  return {
    totalProperties,
    activeListings,
    totalViews,
    pendingAppointments,
    weeklyAppointments,
  };
};
