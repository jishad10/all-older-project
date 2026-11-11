// src/lib/emailTemplates/sellerNewSale.js
const sellerSaleEmail = ({ order, sellerShare }) => {
  const sellerName = order.items[0]?.seller?.firstName || 'Seller';
  const productTitle = order.items[0]?.resource?.title || 'your product';
  const earned = Number(sellerShare).toFixed(2);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>New Sale on Lawbie</title>
  <style type="text/css">
    body { margin:0; padding:0; background:#f4f7fa; font-family:Arial,Helvetica,sans-serif; -webkit-font-smoothing:antialiased; }
    .container { max-width:600px; margin:30px auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e0e4ea; }
    .header { background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:#ffffff; padding:32px 24px; text-align:center; font-size:26px; font-weight:600; }
    .content { padding:32px 28px; color:#333333; font-size:16px; line-height:1.55; }
    .highlight { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:28px 20px; margin:28px 0; text-align:center; }
    .amount { font-size:34px; font-weight:bold; color:#15803d; margin:12px 0 4px; }
    .btn-table { margin:28px auto; text-align:center; }
    .btn { display:inline-block; background:#4f46e5; color:#ffffff; padding:16px 36px; font-size:16px; font-weight:500; text-decoration:none; border-radius:8px; }
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
        New Sale – Congratulations!
      </div>
      <div class="content">
        <p>Hi <strong>${sellerName}</strong>,</p>

        <p>Great news — your product <strong>${productTitle}</strong> has just been purchased on Lawbie! 🎉</p>

        <div class="highlight">
          <p style="font-size:19px; margin:0 0 8px; color:#166534;">You've earned</p>
          <div class="amount">$${earned}</div>
        </div>

        <p>Funds are being processed automatically through Stripe and will appear in your payout schedule according to your settings.</p>

        <div class="btn-table">
          <a href="https://lawbie.com/dashboard" class="btn">Go to Dashboard</a>
        </div>

        <p>Thank you for creating great content and being part of the Lawbie community!</p>

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

export default sellerSaleEmail;