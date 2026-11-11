// src/lib/packagePurchaseEmail.js

/**
 * Builds the confirmation email when a customer buys a package/subscription.
 */
export const packagePurchaseTemplate = ({
  user = {},
  plan = {},
  billingCycle
}) => {
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "there";
  const planName = plan.title || plan.name || "Your package";
  const cycleLabel =
    billingCycle?.charAt(0).toUpperCase() + billingCycle?.slice(1) || "One-time";
  const price = typeof plan.price === "number" ? plan.price.toFixed(2) : "0.00";
  const includedPackages =
    typeof plan.numberOfPackages === "number" ? plan.numberOfPackages : "N/A";

  const featureList =
    Array.isArray(plan.displayFeatures) && plan.displayFeatures.length > 0
      ? `
        <ul>
          ${plan.displayFeatures.map((feature) => `<li>${feature}</li>`).join("")}
        </ul>
      `
      : `<p style="margin: 0;">Your plan is active and ready to use.</p>`;

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
      <h2>Package purchase confirmed</h2>

      <p>Hi ${fullName},</p>
      <p>Thanks for purchasing ${planName}. Your package is now active.</p>

      <h3>Package Details</h3>
      <ul>
        <li><strong>Plan:</strong> ${planName}</li>
        <li><strong>Billing Cycle:</strong> ${cycleLabel}</li>
        <li><strong>Price:</strong> $${price}</li>
        <li><strong>Included Packages:</strong> ${includedPackages}</li>
      </ul>

      <h3>What's Included</h3>
      ${featureList}

      <p>If you have any questions, just reply to this email and we'll help.</p>

      <p>Thank you,<br/>The Support Team</p>
    </div>
  `;
};
