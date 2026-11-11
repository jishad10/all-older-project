import Stripe from "stripe";
import Donation from "./donation.model.js";
import {
  notifyDonationConfirmed,
  notifyDonationReceived,
} from "../notification/notification.events.js";


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
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { donationId } = session.metadata;

      const donation = await Donation.findById(donationId)
        .populate("campaignId", "title createdBy")
        .populate("donorId", "firstName lastName");

      if (!donation) {
        console.error("Donation not found:", donationId);
        return res.status(404).send("Donation not found");
      }

      // Idempotency guard
      if (donation.paymentStatus === "paid") {
        return res.status(200).json({ received: true });
      }

      donation.paymentStatus = "paid";
      donation.stripePaymentIntentId = session.payment_intent;
      await donation.save();

      console.log("Donation paid:", donationId);

      const campaignTitle = donation.campaignId?.title || "a campaign";
      const creatorId = donation.campaignId?.createdBy;
      const donor = donation.donorId;
      const donorName = donor ? `${donor.firstName} ${donor.lastName}` : "Someone";

      // Notify donor: payment confirmed
      await notifyDonationConfirmed({
        donorId: donor._id,
        campaignId: donation.campaignId._id,
        donationId: donation._id,
        campaignTitle,
        amount: donation.amount,
      });

      // Notify campaign creator: new donation received
      if (creatorId) {
        await notifyDonationReceived({
          creatorId,
          campaignId: donation.campaignId._id,
          donationId: donation._id,
          campaignTitle,
          amount: donation.amount,
          donorName,
        });
      }
    }

    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object;
      const { donationId } = session.metadata;

      await Donation.findByIdAndUpdate(donationId, { paymentStatus: "failed" });

      console.log("Donation failed:", donationId);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};






// import Stripe from "stripe";
// import Donation from "./donation.model.js";


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
//     console.error("Webhook signature verification failed:", err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   try {
//     if (event.type === "checkout.session.completed") {
//       const session = event.data.object;
//       const { donationId } = session.metadata;

//       const donation = await Donation.findById(donationId);
//       if (!donation) {
//         console.error("Donation not found:", donationId);
//         return res.status(404).send("Donation not found");
//       }

//       // Idempotency guard
//       if (donation.paymentStatus === "paid") {
//         return res.status(200).json({ received: true });
//       }

//       donation.paymentStatus = "paid";
//       donation.stripePaymentIntentId = session.payment_intent;
//       await donation.save();

//       console.log("Donation paid:", donationId);
//     }

//     if (event.type === "checkout.session.async_payment_failed") {
//       const session = event.data.object;
//       const { donationId } = session.metadata;

//       await Donation.findByIdAndUpdate(donationId, { paymentStatus: "failed" });

//       console.log("Donation failed:", donationId);
//     }

//     return res.status(200).json({ received: true });
//   } catch (error) {
//     console.error("Webhook processing error:", error);
//     return res.status(500).json({ error: "Webhook processing failed" });
//   }
// };