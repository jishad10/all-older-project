
const bookingConfirmationTemplate = ({
  name,
  email,
  category,
  room,
  service,
  time,
  bookingId,
  date
}) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; background-color: #f9f9f9;">
    <div style="text-align: center;">
      <div style="font-size: 48px; color: #ff6600;">✓</div>
      <h2 style="color: #333;">Thank You!</h2>
      <p style="font-size: 14px; color: #666;">Your reservation is confirmed. Get ready for a private experience crafted just for you. </p>
    </div>
    <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 10px; color: #222;">Booking Confirmation</h3>
    <table style="width: 100%; font-size: 14px; color: #333;">
      <tr><td style="padding: 8px 0;"><strong>Booking ID:</strong></td><td>${bookingId}</td></tr>
      <tr><td style="padding: 8px 0;"><strong>Name:</strong></td><td>${name}</td></tr>
      <tr><td style="padding: 8px 0;"><strong>Email:</strong></td><td>${email}</td></tr>
      <tr><td style="padding: 8px 0;"><strong>Category:</strong></td><td>${category}</td></tr>
      <tr><td style="padding: 8px 0;"><strong>Room:</strong></td><td>${room}</td></tr>
      <tr><td style="padding: 8px 0;"><strong>Service:</strong></td><td>${service}</td></tr>
      ${time instanceof Array ? `<tr><td style="padding: 8px 0;"><strong>Time Slots:</strong></td><td>${time.map(slot => `${slot.start} - ${slot.end}`).join(', ')}</td></tr>` : `<tr><td style="padding: 8px 0;"><strong>Time:</strong></td><td>${time}</td></tr>`}
      <tr><td style="padding: 8px 0;"><strong>Booking Date:</strong></td><td>${date}</td></tr>
    </table>
     <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 8px; color: #856404; font-size: 14px;">
      <strong>Important:</strong> Please use code <strong>3388#</strong> to access the main entrance door.
    </div>
    <footer style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 20px; text-align: center; font-size: 12px; color: #aaa;">
      &copy; 2025 Your Company Name. All rights reserved.
    </footer>
  </div>
`;

export default bookingConfirmationTemplate;
