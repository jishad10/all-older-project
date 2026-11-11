// src/lib/returnOrderEmail.js

export const returnOrderCreatedTemplate = (order) => {
  const customer = order.customer || {};
  const stores = order.stores || [];
  const pricing = order.pricing || {};

  const fullName = `${customer.firstName || ""} ${customer.lastName || ""}`.trim();

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
      <h2>Return order created successfully</h2>

      <p>Hi ${fullName || "there"},</p>

      <p>Your return pickup request has been received. Here are the details:</p>

      <h3>Order Info</h3>
      <ul>
        <li><strong>Order ID:</strong> ${order._id}</li>
        <li><strong>Status:</strong> ${order.status}</li>
        <li><strong>Created At:</strong> ${new Date(order.createdAt).toLocaleString("en-US", {
          timeZone: "America/New_York",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        })}</li>
      </ul>

      <h3>Pickup Details</h3>
      <ul>
        <li><strong>Address:</strong> ${customer.pickupLocation?.address || "N/A"}</li>
        <li><strong>Phone:</strong> ${customer.phone || "N/A"}</li>
        <li><strong>Email:</strong> ${customer.email || "N/A"}</li>
      </ul>

<h3>Stores & Packages</h3>
<ul>
  ${stores
    .map(
      (s) => `
        <li>
          <strong>Store:</strong> ${
            s.store === "OTHER"
              ? (s.otherStoreName || "Other")
              : s.store
          } <br/>
          <strong>Packages:</strong> ${s.numberOfPackages}
        </li>
      `
    )
    .join("")}
</ul>


      <h3>Pricing</h3>
      <ul>
        <li><strong>Extra Fees:</strong> $${pricing.extraFees?.toFixed(2) ?? "0.00"}</li>
      </ul>

      <p>We will notify you as soon as a driver is on the way.</p>

      <p>Thank you,<br/>The Support Team</p>
    </div>
  `;
};


export const returnOrderStatusUpdateTemplate = ({ order, status }) => {
  const customer = order.customer || {};
  const fullName = `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "there";
  const readableStatus = {
    ON_MY_WAY: "Driver is on the way",
    PICKED_UP: "Package picked up",
    COMPLETED: "Return completed",
  }[status] || status;

  const reviewBlock =
    status === "COMPLETED"
      ? `
      <h3>We’d love your feedback</h3>
      <p>Thanks for choosing our service. If you enjoyed the experience, please share a quick review — it helps us keep improving.</p>
      <p><a href="https://ezreturn.pro/user/review/${encodeURIComponent(order._id)}" style="color: #0f62fe;">Leave a review</a></p>
    `
      : "";

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
      <h2>Return orders update</h2>
      <p>Hi ${fullName},</p>
      <p>Status: <strong>${readableStatus}</strong></p>

      <h3>Order Info</h3>
      <ul>
        <li><strong>Order ID:</strong> ${order._id}</li>
        <li><strong>Current Status:</strong> ${order.status}</li>
        <li><strong>Pickup Address:</strong> ${customer.pickupLocation?.address || "N/A"}</li>
      </ul>
      ${reviewBlock}
      <p>Thanks,<br/>Support Team</p>
    </div>
  `;
};
