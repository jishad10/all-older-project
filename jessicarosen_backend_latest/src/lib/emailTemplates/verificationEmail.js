// src/lib/emailTemplates/verificationEmail.js
const verificationEmailTemplate = ({ email, otp }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Verify Your Lawbie Account</title>
  <style type="text/css">
    body { margin:0; padding:0; background:#f4f7fa; font-family:Arial,Helvetica,sans-serif; -webkit-font-smoothing:antialiased; }
    .container { max-width:600px; margin:30px auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e0e4ea; }
    .header { background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:#ffffff; padding:32px 24px; text-align:center; font-size:26px; font-weight:600; }
    .content { padding:32px 28px; color:#333333; font-size:16px; line-height:1.55; }
    .highlight { background:#f8f9ff; border:1px solid #e3e8ff; border-radius:10px; padding:28px 20px; margin:28px 0; text-align:center; }
    .code { font-family:monospace; font-size:38px; font-weight:bold; letter-spacing:10px; color:#4f46e5; margin:16px 0; }
    .footer { background:#f8f9fa; padding:24px; text-align:center; font-size:13px; color:#6b7280; border-top:1px solid #e5e7eb; }
    .footer a { color:#4f46e5; text-decoration:none; }
    .small { font-size:14px; color:#6b7280; }
    @media screen and (max-width: 600px) {
      .container { margin:20px 10px !important; }
      .content { padding:24px 20px !important; }
    }
  </style>
</head>
<body>
  <center>
    <div class="container">
      <div class="header">
        Verify Your Lawbie Account
      </div>
      <div class="content">
        <p>Hi <strong>${email}</strong>,</p>
        <p>Thank you for signing up with Lawbie.<br>Please use the following code to verify your email address:</p>

        <div class="highlight">
          <div class="code">${otp}</div>
          <div class="small">This code will expire in 10 minutes.</div>
        </div>

        <p>If you didn’t request this verification, please ignore this email — your account remains safe.</p>

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

export default verificationEmailTemplate;