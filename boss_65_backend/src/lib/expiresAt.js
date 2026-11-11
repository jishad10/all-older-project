import cron from 'node-cron';
import Booking from '../entities/booking/booking.model.js';

// Function to find and cancel expired pending bookings
const expirePendingBookings = async () => {
  const now = new Date();

  try {
    const result = await Booking.updateMany(
      { status: 'pending', expiresAt: { $lt: now } },
      { status: 'cancelled' }
    );
    if (result.modifiedCount > 0) {
      console.log(`[${new Date().toISOString()}] Cancelled ${result.modifiedCount} expired pending bookings.`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error cancelling expired bookings:`, error);
  }
};

// Schedule the job to run every minute
cron.schedule('* * * * *', () => {
  console.log(`[${new Date().toISOString()}] Running booking expiration check...`);
  expirePendingBookings();
});

// Export in case you want to import it somewhere (optional)
export default expirePendingBookings;
