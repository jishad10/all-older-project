import Stripe from 'stripe';
import Booking from '../booking/booking.model.js';
import { Payment } from './payment.model.js';
import { generateResponse } from '../../lib/responseFormate.js';
import bookingConfirmationTemplate from '../../lib/payment_success_template.js';
import sendEmail from '../../lib/sendEmail.js';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


export const payment = async (req, res) => {
  const { booking: bookingId } = req.body;

  if (!bookingId) {
    return res.status(400).json({ success: false, message: 'Booking ID is required.' });
  }

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const total = booking.total;
    const totalPriceInCent = total * 100;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'sgd',
            product_data: {
              name: 'Room Booking',
            },
            unit_amount: totalPriceInCent,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/success/${bookingId}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel?bookingId=${bookingId}`,

    });

    
    const newPayment = new Payment({
      booking: booking._id,
      price: total,
      stripeSessionId: session.id,
      paymentIntentId: session.payment_intent,
      status: 'pending',
    });
    await newPayment.save();

    
    booking.stripeSessionId = session.id;
    await booking.save();

    generateResponse(res, 200, true, 'Payment session created successfully', {
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      url: session.url
    });
  } catch (error) {
  generateResponse(res, 500, false, 'Payment session creation failed', error.message);
  }
};


export const confirmPaymentController = async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return generateResponse(res, 400, false, "Booking ID is required");

    // Find booking
    const booking = await Booking.findById(bookingId)
      .populate('room')
      .populate({ path: 'service', populate: { path: 'category' } });
    if (!booking) return generateResponse(res, 404, false, "Booking not found");

    // Fetch latest Stripe session status
    const session = await stripe.checkout.sessions.retrieve(booking.stripeSessionId);

    if (!session) return generateResponse(res, 400, false, "Stripe session not found");

    // If payment is successful
    if (session.payment_status === 'paid') {
      // Update payment & booking in DB
      await Payment.findOneAndUpdate(
        { stripeSessionId: session.id },
        { paymentStatus: 'paid' },
        { new: true }
      );

      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
      await booking.save();

      // Send confirmation email
      const formatDate = (date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      };

      const emailHtml = bookingConfirmationTemplate({
        name: `${booking.user.firstName} ${booking.user.lastName}`,
        email: booking.user.email,
        category: booking.service.category.name,
        room: booking.room.title,
        service: booking.service.name,
        time: booking.timeSlots,
        bookingId: booking._id,
        date: formatDate(booking.date)
      });

      await sendEmail({
        to: booking.user.email,
        subject: 'Your Booking Confirmation',
        html: emailHtml,
      });

      return generateResponse(res, 200, true, "Payment confirmed and email sent", booking);
    } else {
      return generateResponse(res, 400, false, "Payment not completed yet");
    }
  } catch (error) {
    console.error("Payment confirm error:", error);
    generateResponse(res, 500, false, "Payment confirmation failed", error.message);
  }
};


export const getBookingDetails = async (req, res) => {
  const bookingId = req.params.bookingId || req.query.bookingId;

  if (!bookingId) {
    return generateResponse(res, 400, false, 'Booking ID is required');
  }

  try {
    const booking = await Booking.findById(bookingId)
    .populate('user', 'name email photoURL')         
    .populate('room', 'title maxcapacity')      
    .populate({
      path: 'service',
      select: 'name price  category',
      populate: {
        path: 'category',
        select: 'name description'
      }
    })
    .lean();

    if (!booking) {
      return generateResponse(res, 404, false, 'Booking not found');
    }

    return generateResponse(res, 200, true, 'Booking details fetched successfully', booking);
  } catch (error) {
    console.error('Error fetching booking:', error.message);
    return generateResponse(res, 500, false, 'Internal Server Error', error.message);
  }
};


















// export const updatePaymentStatus = async (req, res) => {
//   const { stripeSessionId } = req.query;

//   if (!stripeSessionId) {
//     return res.status(400).json({ success: false, message: 'stripeSessionId is required.' });
//   }

//   try {
//     const session = await stripe.checkout.sessions.retrieve(stripeSessionId);

//     let paymentStatus = session?.payment_status === 'paid' ? 'paid' : 'failed';

//     // Update Payment record
//     const payment = await Payment.findOneAndUpdate(
//       { stripeSessionId },
//       { status: paymentStatus },
//       { new: true }
//     );

//     if (!payment) {
//       return res.status(404).json({ success: false, message: 'Payment not found.' });
//     }

//     // Update Booking status and payment status
//     const booking = await Booking.findByIdAndUpdate(
//       payment.booking,
//       {
//         status: paymentStatus === 'paid' ? 'confirmed' : 'cancelled',
//         paymentStatus: paymentStatus,
//       },
//       { new: true }
//     );

//     res.status(200).json({
//       success: true,
//       message: `Payment marked as ${paymentStatus}.`,
//       data: {
//         payment,
//         booking,
//       },
//     });
//   } 
//   catch (error) {
//     console.error('Error updating payment status:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to update payment status',
//       error: error.message,
//     });
//   }
//};
