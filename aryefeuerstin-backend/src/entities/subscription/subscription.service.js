import Stripe from "stripe";
import Plan from "../plan/plan.model.js";
import User from "../auth/auth.model.js";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// export const createSubscriptionCheckoutService = async (userId, planId) => {
//   const plan = await Plan.findById(planId);
//   if (!plan) throw new Error("Plan not found");

//   const user = await User.findById(userId);
//   if (!user) throw new Error("User not found");

//   const priceInCents = plan.price * 100;

//   const session = await stripe.checkout.sessions.create({
//     mode: "payment",
//     payment_method_types: ["card"],
//     customer_email: user.email,

//     line_items: [
//       {
//         price_data: {
//           currency: "usd",
//           product_data: { name: plan.name },
//           unit_amount: priceInCents,
//         },
//         quantity: 1,
//       },
//     ],

//     metadata: {
//       userId: userId.toString(),
//       planId: planId.toString(),
//       billingCycle: plan.billingCycle,
//     },

//     success_url: `${process.env.FRONTEND_URL}/subscription-success`,
//     cancel_url: `${process.env.FRONTEND_URL}/subscription-cancel`,
//   });

//   return session.url;
// };


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createSubscriptionCheckoutService = async (userId, planId) => {
  const plan = await Plan.findById(planId);
  if (!plan) throw new Error("Plan not found");

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const priceInCents = Math.round(plan.price * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: user.email,

    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: plan.title || plan.name,
            description: plan.billingCycle.toUpperCase()
          },
          unit_amount: priceInCents
        },
        quantity: 1
      }
    ],

    metadata: {
      userId: userId.toString(),
      planId: planId.toString(),
      billingCycle: plan.billingCycle
    },

    success_url: `${process.env.FRONTEND_URL}/subscription-success`,
    cancel_url: `${process.env.FRONTEND_URL}/subscription-cancel`
  });

  return session.url;
};