// ✅ ESM
const verificationCodeTemplate = (code) => `
  <div style="font-family: Arial, Helvetica, sans-serif; background: #f4f7fb; padding: 32px 16px; color: #1f2937;">
    <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);">
      <div style="padding: 28px 28px 24px; background: linear-gradient(135deg, #8BCCE6 0%, #F6855C 100%); color: #ffffff; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.92;">Secure Verification</p>
        <h1 style="margin: 0; font-size: 30px; line-height: 1.2; font-weight: 700;">Your OTP Code</h1>
      </div>

      <div style="padding: 28px;">
        <p style="margin: 0 0 14px; font-size: 16px; line-height: 1.7; color: #4b5563;">Hello,</p>
        <p style="margin: 0 0 22px; font-size: 15px; line-height: 1.8; color: #4b5563;">
          Use the verification code below to continue securely with your account.
        </p>

        <div style="margin: 0 0 22px; padding: 22px 18px; border-radius: 16px; background: #f8fbfd; border: 1px solid #dbeaf1; text-align: center;">
          <p style="margin: 0 0 10px; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #6b7280;">One-Time Password</p>
          <div style="font-size: 34px; line-height: 1; font-weight: 800; letter-spacing: 0.38em; color: #111827; text-indent: 0.38em;">
            ${code}
          </div>
        </div>

        <div style="margin: 0 0 22px; padding: 16px 18px; border-radius: 14px; background: #fff7f2; border: 1px solid #fde3d7;">
          <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #9a3412;">
            This code will expire in 10 minutes. Please do not share it with anyone.
          </p>
        </div>

        <p style="margin: 0; font-size: 14px; line-height: 1.8; color: #6b7280;">
          If you did not request this verification code, you can safely ignore this email.
        </p>
      </div>

      <div style="padding: 18px 28px; border-top: 1px solid #eef2f7; background: #fbfcfe; text-align: center;">
        <p style="margin: 0; font-size: 12px; line-height: 1.7; color: #9ca3af;">
          This is an automated security email. Please do not reply directly to this message.
        </p>
      </div>
    </div>
  </div>
`;

export default verificationCodeTemplate;

export const getSubscriptionPaymentConfirmationTemplate = ({
  name,
  accountRole,
  planName,
  billingCycle,
  amount,
  currency = 'USD',
  stripeSessionId,
  paymentDate,
  subscriptionStartDate,
  subscriptionEndDate,
}) => {
  const formatDate = (value) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAmount = typeof amount === 'number'
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: (currency || 'USD').toUpperCase(),
      }).format(amount)
    : 'Paid';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; background: #ffffff;">
      <div style="padding: 28px; background: linear-gradient(135deg, #8BCCE6 0%, #F6855C 100%); color: #ffffff;">
        <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;">Payment Confirmation</p>
        <h1 style="margin: 0; font-size: 28px; line-height: 1.2;">Your payment was successful</h1>
      </div>
      <div style="padding: 28px; color: #374151;">
        <p style="margin-top: 0; font-size: 16px;">Hello ${name},</p>
        <p style="font-size: 15px; line-height: 1.7;">
          Thank you for your payment. Your ${accountRole.toLowerCase()} account subscription is now active and ready to use.
        </p>

        <div style="margin: 24px 0; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb; padding: 20px; overflow: hidden;">
          <h2 style="margin: 0 0 14px; font-size: 18px; color: #111827;">Payment details</h2>
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 14px;">
            <tr>
              <td style="width: 36%; padding: 8px 12px 8px 0; color: #6b7280; vertical-align: top;">Plan</td>
              <td style="width: 64%; padding: 8px 0; color: #111827; font-weight: 600; text-align: left; vertical-align: top; word-break: break-word; overflow-wrap: anywhere;">${planName}</td>
            </tr>
            <tr>
              <td style="width: 36%; padding: 8px 12px 8px 0; color: #6b7280; vertical-align: top;">Billing cycle</td>
              <td style="width: 64%; padding: 8px 0; color: #111827; font-weight: 600; text-align: left; vertical-align: top; word-break: break-word; overflow-wrap: anywhere;">${billingCycle}</td>
            </tr>
            <tr>
              <td style="width: 36%; padding: 8px 12px 8px 0; color: #6b7280; vertical-align: top;">Amount paid</td>
              <td style="width: 64%; padding: 8px 0; color: #111827; font-weight: 600; text-align: left; vertical-align: top; word-break: break-word; overflow-wrap: anywhere;">${formatAmount}</td>
            </tr>
            <tr>
              <td style="width: 36%; padding: 8px 12px 8px 0; color: #6b7280; vertical-align: top;">Payment date</td>
              <td style="width: 64%; padding: 8px 0; color: #111827; font-weight: 600; text-align: left; vertical-align: top; word-break: break-word; overflow-wrap: anywhere;">${formatDate(paymentDate)}</td>
            </tr>
            <tr>
              <td style="width: 36%; padding: 8px 12px 8px 0; color: #6b7280; vertical-align: top;">Subscription starts</td>
              <td style="width: 64%; padding: 8px 0; color: #111827; font-weight: 600; text-align: left; vertical-align: top; word-break: break-word; overflow-wrap: anywhere;">${formatDate(subscriptionStartDate)}</td>
            </tr>
            <tr>
              <td style="width: 36%; padding: 8px 12px 8px 0; color: #6b7280; vertical-align: top;">Subscription ends</td>
              <td style="width: 64%; padding: 8px 0; color: #111827; font-weight: 600; text-align: left; vertical-align: top; word-break: break-word; overflow-wrap: anywhere;">${formatDate(subscriptionEndDate)}</td>
            </tr>
            <tr>
              <td style="width: 36%; padding: 8px 12px 8px 0; color: #6b7280; vertical-align: top;">Reference</td>
              <td style="width: 64%; padding: 8px 0; color: #111827; font-weight: 600; text-align: left; vertical-align: top; word-break: break-all; overflow-wrap: anywhere; line-height: 1.5;">${stripeSessionId || 'N/A'}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 15px; line-height: 1.7;">
          You can now sign in and access your dashboard. Please keep this email for your records.
        </p>

        <p style="margin-bottom: 0; font-size: 14px; color: #6b7280;">
          If you have any questions about your subscription, please contact support.
        </p>
      </div>
    </div>
  `;
};


export const getPaymentSuccessTemplate = ({ name, eventId, slots }) => {
  const slotDetails = slots
    .map(
      (slot, index) =>
        `<li><strong>Slot ${index + 1}:</strong> ${slot.date} from ${slot.startTime} to ${slot.endTime}</li>`
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>✅ Booking Confirmed</h2>
      <p>Dear ${name},</p>
      <p>Your payment has been successfully received and your booking has been confirmed.</p>
      <p><strong>Event ID:</strong> ${eventId}</p>
      <p><strong>Slot(s) Booked:</strong></p>
      <ul>
        ${slotDetails}
      </ul>
      <br />
      <p>Thank you for choosing our service.</p>
      <p>We look forward to seeing you at the event.</p>
      <br />
    
      
    </div>
  `;
};


// auto refunded template

export const getConflictAfterPaymentTemplate = ({
  name,
  email,
  phone,
  eventId,
  eventTitle,
  selectedDate,
  selectedSlots = [],
  sessionId,
  paymentIntentId,
  refundAmount,
}) => {
  const slotDetails = selectedSlots
    .map(
      (slot, index) =>
        `<li><strong>Slot ${index + 1}:</strong> ${slot.date} from ${slot.startTime} to ${slot.endTime}</li>`
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>⚠️ Booking Conflict Detected After Payment</h2>

      <p><strong>Customer Details:</strong></p>
      <ul>
        <li><strong>Name:</strong> ${name}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Phone:</strong> ${phone}</li>
      </ul>

      <p><strong>Event Details:</strong></p>
      <ul>
        <li><strong>Event ID:</strong> ${eventId}</li>
        <li><strong>Event Title:</strong> ${eventTitle || 'N/A'}</li>
        <li><strong>Date:</strong> ${selectedDate}</li>
      </ul>

      <p><strong>Attempted Slot(s):</strong></p>
      <ul>
        ${slotDetails}
      </ul>

      <p><strong>Stripe Info:</strong></p>
      <ul>
        <li><strong>Session ID:</strong> ${sessionId}</li>
        <li><strong>Payment Intent ID:</strong> ${paymentIntentId}</li>
        ${
          refundAmount
            ? `<li><strong>Refund Amount:</strong> $${(refundAmount / 100).toFixed(2)}</li>`
            : ''
        }
        <li><strong>Refund Status:</strong> Refund automatically processed</li>
      </ul>

      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>

      <br />
      <p style="color: red;">
        ⚠️ Some of the selected slots were already booked by the time payment completed.<br/>
        The booking was not created, and the payment has been refunded.
      </p>
    </div>
  `;
};

export const getPaymentSuccessForAdminTemplate = ({ name, email, phone, eventId, slots }) => {
  const slotDetails = slots
    .map(
      (slot, index) =>
        `<li><strong>Slot ${index + 1}:</strong> ${slot.date} from ${slot.startTime} to ${slot.endTime}</li>`
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>📥 New Booking Received</h2>
      <p><strong>User Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Event ID:</strong> ${eventId}</p>
      <p><strong>Slot(s) Booked:</strong></p>
      <ul>
        ${slotDetails}
      </ul>
      <br />
      <p>This booking has been paid and confirmed via Stripe.</p>
      <p>Please make necessary arrangements for the event.</p>
    </div>
  `;
};


// ─── INQUIRY TEMPLATES ───────────────────────────────────────

/**
 * Email sent to SENDER when landlord/agent replies
 */
export const getOwnerReplyTemplate = ({ senderName, ownerName, propertyTitle, replyMessage, originalMessage }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 24px; border-radius: 10px; background: #f9f9f9;">
    <h2 style="color: #333;">💬 Reply from Property Owner</h2>
    <p>Hi <strong>${senderName}</strong>,</p>
    <p><strong>${ownerName}</strong> has replied to your inquiry about <strong>${propertyTitle}</strong>.</p>

    <p style="color:#555;"><strong>Their reply:</strong></p>
    <p style="background:#fff; padding:12px; border-left: 4px solid #007BFF; border-radius:4px;">${replyMessage}</p>

    <p style="color:#555; margin-top:16px;"><strong>Your original message:</strong></p>
    <p style="background:#fff; padding:12px; border-left: 4px solid #ccc; border-radius:4px; color:#888;">${originalMessage}</p>

    <p style="color:#aaa; font-size:12px; margin-top:20px;">Thank you for using our platform.</p>
  </div>
`;
