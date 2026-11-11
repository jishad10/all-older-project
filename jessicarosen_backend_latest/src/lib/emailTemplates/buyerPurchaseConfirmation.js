// src/lib/emailTemplates/buyerPurchaseConfirmation.js
const buyerPurchaseEmail = (order) => {
  const firstName = order.user?.firstName || 'Customer';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your Lawbie Purchase Confirmation</title>
  <style type="text/css">
    body { margin:0; padding:0; background:#f4f7fa; font-family:Arial,Helvetica,sans-serif; -webkit-font-smoothing:antialiased; }
    .container { max-width:600px; margin:30px auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e0e4ea; }
    .header { background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:#ffffff; padding:32px 24px; text-align:center; font-size:26px; font-weight:600; }
    .content { padding:32px 28px; color:#333333; font-size:16px; line-height:1.55; }
    .btn-table { margin:28px auto; text-align:center; }
    .btn { display:inline-block; background:#4f46e5; color:#ffffff; padding:16px 36px; font-size:16px; font-weight:500; text-decoration:none; border-radius:8px; }
    .highlight { background:#f8f9ff; border:1px solid #e3e8ff; border-radius:10px; padding:20px; margin:24px 0; text-align:center; font-size:15px; }
    .footer { background:#f8f9fa; padding:24px; text-align:center; font-size:13px; color:#6b7280; border-top:1px solid #e5e7eb; }
    .footer a { color:#4f46e5; text-decoration:none; }
    @media screen and (max-width: 600px) {
      .container { margin:20px 10px !important; }
      .content { padding:24px 20px !important; }
      .btn { padding:14px 28px !important; font-size:15px !important; }
    }
  </style>
</head>
<body>
  <center>
    <div class="container">
      <div class="header">
        Your Purchase Confirmation
      </div>
      <div class="content">
        <p>Hi <strong>${firstName}</strong>,</p>

        <p>Thank you for your purchase on <strong>Lawbie</strong> 🎉</p>

        <p>Your payment was successful — your document(s) are now available for download.</p>

        <div class="btn-table">
          <a href="https://lawbie.com/account/orders" class="btn">View My Orders & Downloads</a>
        </div>

        <p>You can return to your files at any time by logging into your Lawbie account and visiting the <strong>My Orders</strong> page.</p>

        <p>If you have any questions or need assistance, feel free to reply to this email or contact us at <a href="mailto:support@lawbie.com">support@lawbie.com</a>.</p>

        <p style="margin-top:28px;">Thank you for supporting legal creators and being part of the Lawbie community!</p>

        <p style="margin-top:32px;">Best regards,<br><strong>The Lawbie Team</strong></p>
      </div>
      <div class="footer">
        <p>Lawbie © ${new Date().getFullYear()} All rights reserved.</p>
        <p>
          <a href="https://lawbie.com">www.lawbie.com</a>
          <a href="mailto:support@lawbie.com">support@lawbie.com</a>
        </p>
      </div>
    </div>
  </center>
</body>
</html>
  `;
};

export default buyerPurchaseEmail;