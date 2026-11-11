import sendEmail from "../../lib/sendEmail.js";
import { generateResponse } from "../../lib/responseFormate.js";

export const sendEmailController = async (req, res) => {
  const { email, subject, body } = req.body;

  if (!email || !subject || !body) {
    return generateResponse(res, 400, "fail", "Email, subject, and body are required", null);
  }

  try {
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h1 style="color: #333;">${subject}</h1>
        <p style="color: #555;">Hello,</p>
        <p>${body}</p>
        <p style="color: #555;">Thank you for using our service!</p>
      </div>
    `;

    const result = await sendEmail({ to: email, subject, html });

    if (result.success) {
      return generateResponse(res, 200, "success", "Email sent successfully", {
        to: email,
        subject,
        sentAt: new Date().toISOString(),
      });
    } else {
      return generateResponse(res, 500, "error", "Failed to send email", {
        error: result.error || "Unknown error while sending email",
      });
    }
  } catch (error) {
    return generateResponse(res, 500, "error", "An unexpected error occurred while sending email", {
      error: error.message,
    });
  }
};
