import Stripe from "stripe";
import Plan from "../plan/plan.model.js";
import User from "../auth/auth.model.js";
import ReturnOrder from "../returnOrder/returnOrder.model.js";
import Payment from "../payment/payment.model.js";
import { returnOrderCreatedTemplate } from "../../lib/returnOrderEmail.js";
import { packagePurchaseTemplate } from "../../lib/packagePurchaseEmail.js";
import sendEmail from "../../lib/sendEmail.js";


// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


// export const stripeWebhook = async (req, res) => {
//   const sig = req.headers["stripe-signature"];

//   let event;
//   try {
//     event = stripe.webhooks.constructEvent(
//       req.body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (err) {
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   if (event.type === "checkout.session.completed") {
//     const session = event.data.object;

//     const userId = session.metadata.userId;
//     const planId = session.metadata.planId;
//     const billingCycle = session.metadata.billingCycle;

//     const plan = await Plan.findById(planId);
//     if (!plan) return res.status(400).send("Plan not found");

//     const user = await User.findById(userId);
//     if (!user) return res.status(400).send("User not found");

//     // Calculate subscription dates
//     const startDate = new Date();
//     let endDate = new Date(startDate);

//     if (billingCycle === "monthly") endDate.setMonth(endDate.getMonth() + 1);
//     if (billingCycle === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);
//     if (billingCycle === "basic") endDate = null; 

//     // Update subscription
//     user.subscription = {
//       planId,
//       startDate,
//       endDate,
//     };

//     user.hasActiveSubscription = true;
//     user.subscriptionExpireDate = endDate;

//     await user.save();
//   }

//   res.status(200).send("Webhook received");
// };


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const userId = session.metadata.userId;
      const planId = session.metadata.planId;
      const billingCycle = session.metadata.billingCycle;

      const plan = await Plan.findById(planId);
      if (!plan) return res.status(400).send("Plan not found");

      const user = await User.findById(userId);
      if (!user) return res.status(400).send("User not found");

      /**
       * ----------------------------------
       * CALCULATE SUBSCRIPTION DATES
       * ----------------------------------
       */
      const startDate = new Date();
      let endDate = null;

      if (billingCycle === "monthly") {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
      }

      if (billingCycle === "yearly") {
        endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      /**
       * ----------------------------------
       * UPDATE USER SUBSCRIPTION (CRITICAL)
       * ----------------------------------
       */
      user.subscription = {
        planId: plan._id,
        startDate,
        endDate
      };

      user.subscriptionUsage = {
        returnOrdersUsed: 0 // 🔥 RESET USAGE
      };

      user.hasActiveSubscription = true;
      user.subscriptionExpireDate = endDate;

      await user.save();

      try {
        if (user.email) {
          const html = packagePurchaseTemplate({
            user,
            plan,
            billingCycle,
            startDate,
            endDate
          });

          await sendEmail({
            to: user.email,
            subject: "Your package purchase is confirmed",
            html
          });
        }
      } catch (emailError) {
        console.error("Package purchase email failed:", emailError);
      }
    }

    res.status(200).send("Webhook received");
  } catch (error) {
    console.error("Stripe webhook error:", error);
    res.status(500).send("Webhook processing failed");
  }
};



export const stripePaymentWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET_PAYMENT
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata.userId;
    const returnOrderId = session.metadata.returnOrderId;

    const user = await User.findById(userId);
    if (!user) return res.status(400).send("User not found");

    const returnOrder = await ReturnOrder.findById(returnOrderId);
    if (!returnOrder)
      return res.status(400).send("Return order not found");

    // Update Payment
    await Payment.findOneAndUpdate(
      { stripeSessionId: session.id },
      {
        status: "PAID",
        paymentIntentId: session.payment_intent,
        transactionId: session.payment_intent
      }
    );

    // Update ReturnOrder
    await ReturnOrder.findByIdAndUpdate(returnOrderId, {
      status: "PENDING",
      paymentStatus: "PAID"
    });

    try {
      if (returnOrder.customer?.email) {
        const html = returnOrderCreatedTemplate(returnOrder);

        await sendEmail({
          to: returnOrder.customer.email,
          subject: "Your return order has been confirmed",
          html
        });
      }
    } catch (emailError) {
      console.error("Payment success email failed:", emailError);
    }
  }

  if (
    event.type === "checkout.session.expired" ||
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "payment_intent.payment_failed"
  ) {
    const session = event.data.object;

    await Payment.findOneAndUpdate(
      { stripeSessionId: session.id },
      { status: "FAILED" }
    );

    await ReturnOrder.findByIdAndUpdate(session.metadata.returnOrderId, {
      paymentStatus: "FAILED"
    });
  }

  res.status(200).send("Webhook received");
};



// export const stripePaymentWebhook = async (req, res) => {
//   const sig = req.headers["stripe-signature"];
//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(
//       req.body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET_PAYMENT
//     );
//   } catch (err) {
//     console.error("Webhook signature verification failed:", err);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

// if (event.type === "checkout.session.completed") {
//   const session = event.data.object;
//   const userId = session.metadata.userId;
//   const returnOrderId = session.metadata.returnOrderId;

//   const user = await User.findById(userId);
//   if (!user) return res.status(400).send("User not found");

//   const returnOrder = await ReturnOrder.findById(returnOrderId);
//   if (!returnOrder) return res.status(400).send("Return order not found");

//   // Update Payment
//   await Payment.findOneAndUpdate(
//     { stripeSessionId: session.id },
//     {
//       status: "PAID",
//       paymentIntentId: session.payment_intent,
//       transactionId: session.payment_intent
//     }
//   );

//   // Update ReturnOrder
//   await ReturnOrder.findByIdAndUpdate(returnOrderId, {
//     status: "ON_MY_WAY",
//     paymentStatus: "PAID"
//   });
// }

// if (
//   event.type === "checkout.session.expired" ||
//   event.type === "checkout.session.async_payment_failed" ||
//   event.type === "payment_intent.payment_failed"
// ) {
//   const session = event.data.object;

//   await Payment.findOneAndUpdate(
//     { stripeSessionId: session.id },
//     { status: "FAILED" }
//   );

//   await ReturnOrder.findByIdAndUpdate(session.metadata.returnOrderId, {
//     paymentStatus: "FAILED"
//   });
// }


//   res.status(200).send("Webhook received");
// };
