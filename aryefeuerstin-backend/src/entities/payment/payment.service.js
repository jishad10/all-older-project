import ReturnOrder from "../returnOrder/returnOrder.model.js";
import Payment from "./payment.model.js";
import Stripe from "stripe";
import User from "../auth/auth.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createReturnOrderCheckoutService = async (
  userId,
  returnOrderId
) => {
  const returnOrder = await ReturnOrder.findById(returnOrderId);
  if (!returnOrder) throw new Error("Return order not found");

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const amountInCents = Math.round(returnOrder.pricing.totalAmount * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: user.email,

    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Return Pickup Service"
          },
          unit_amount: amountInCents
        },
        quantity: 1
      }
    ],

    metadata: {
      userId: userId.toString(),
      returnOrderId: returnOrderId.toString()
    },

    success_url: `${process.env.FRONTEND_URL}/payment-success`,
    cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`
  });

  await Payment.create({
    user: userId,
    returnOrder: returnOrderId,
    stripeSessionId: session.id,
    amount: returnOrder.pricing.totalAmount,
    status: "PENDING"
  });

  return session.url;
};