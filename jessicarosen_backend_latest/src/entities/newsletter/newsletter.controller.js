import { generateResponse } from "../../lib/responseFormate.js";
import sendEmail from "../../lib/sendEmail.js";
import Newsletter from "./mewsletter.model.js";


export const subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return generateResponse(res, 400, false, 'Email is required', null);
    }

    const existing = await Newsletter.findOne({ email });

    if (existing) {
      return generateResponse(res, 200, true, 'Already subscribed', existing);
    }

    const subscriber = await Newsletter.create({ email });

    generateResponse(res, 200, true, 'Subscribed successfully', subscriber);
  } catch (error) {
    console.error('Subscribe Error:', error);
    generateResponse(res, 500, false, 'Something went wrong', null);
  }
};


export const broadcastNewsletter = async (req, res) => {
  try {
    const { subject, html } = req.body;

    if (!subject || !html) {
      return generateResponse(res, 400, false, 'Subject and HTML content are required', null);
    }

    const subscribers = await Newsletter.find();
    const emails = subscribers.map((s) => s.email);

    await Promise.all(
      emails.map((to) => sendEmail({ to, subject, html }))
    );

    generateResponse(res, 200, true, 'Email sent to all newsletter subscribers', {});
  } catch (error) {
    console.error('Broadcast Error:', error);
    generateResponse(res, 500, false, 'Failed to send emails', null);
  }
};
