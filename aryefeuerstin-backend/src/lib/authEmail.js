export const welcomeEmailTemplate = ({ firstName = '', lastName = '' } = {}) => {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'there';

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
      <h2>Thanks for signing up</h2>
      <p>Hi ${fullName},</p>
      <p>Thanks for creating an account. You're all set to start using the website.</p>
      <p>Cheers,<br/>The Team</p>
    </div>
  `;
};

