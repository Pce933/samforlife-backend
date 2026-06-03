const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || `"SAM for Life Website" <${SMTP_USER}>`;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || SMTP_USER;

// Setup SMTP Transporter
let transporter = null;
const isConfigured = SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_PASS !== 'YOUR_IONOS_EMAIL_PASSWORD_HERE';

if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // True for 465 SSL, False for 587 TLS
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });
} else {
  console.warn('[Mailer] SMTP configuration is missing or using default password placeholder. Emails will be logged but not sent.');
}

/**
 * Common HTML email wrapper to apply professional styling.
 */
const getEmailWrapper = (title, contentHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #334155;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a, #0d9488);
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 32px 24px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0d9488;
      margin-bottom: 16px;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 8px;
    }
    .field-group {
      margin-bottom: 20px;
    }
    .field-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.025em;
      margin-bottom: 4px;
    }
    .field-value {
      font-size: 15px;
      color: #0f172a;
      line-height: 1.5;
      background-color: #f8fafc;
      padding: 10px 14px;
      border-radius: 6px;
      border: 1px solid #f1f5f9;
    }
    .field-value-text {
      white-space: pre-wrap;
    }
    .footer {
      background-color: #f1f5f9;
      text-align: center;
      padding: 20px 24px;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #0d9488;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>SAM FOR LIFE</h1>
        <p>${title}</p>
      </div>
      <div class="content">
        ${contentHtml}
      </div>
      <div class="footer">
        <p>This is an automated notification from the SAM for Life website.</p>
        <p><a href="https://samforlife.org/admin">Go to Admin Dashboard</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Send an email notification. Catch errors locally to avoid breaking web routes.
 */
const sendNotificationEmail = async ({ subject, html }) => {
  if (!transporter) {
    console.warn('[Mailer] SMTP is unconfigured. Simulated Email Log:');
    console.warn('----------------------------------------------------');
    console.warn(`TO: ${NOTIFICATION_EMAIL}`);
    console.warn(`SUBJECT: ${subject}`);
    console.warn('----------------------------------------------------');
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: NOTIFICATION_EMAIL,
      subject,
      html,
    });
    console.log(`[Mailer] Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Mailer] Error sending email:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Send a notification for a contact submission.
 */
const sendContactNotification = async (data) => {
  const html = getEmailWrapper('New Contact Form Submission', `
    <div class="section-title">Submission Details</div>
    
    <div class="field-group">
      <div class="field-label">Name</div>
      <div class="field-value">${data.name}</div>
    </div>
    
    <div class="field-group">
      <div class="field-label">Email</div>
      <div class="field-value"><a href="mailto:${data.email}">${data.email}</a></div>
    </div>
    
    <div class="field-group">
      <div class="field-label">Subject</div>
      <div class="field-value">${data.subject}</div>
    </div>
    
    <div class="field-group">
      <div class="field-label">Message</div>
      <div class="field-value field-value-text">${data.message}</div>
    </div>
  `);

  return sendNotificationEmail({
    subject: `[Contact Form] ${data.subject} - from ${data.name}`,
    html,
  });
};

/**
 * Send a notification for a volunteer application.
 */
const sendVolunteerNotification = async (data) => {
  const html = getEmailWrapper('New Volunteer Application', `
    <div class="section-title">Applicant Details</div>
    
    <div class="field-group">
      <div class="field-label">Name</div>
      <div class="field-value">${data.name}</div>
    </div>
    
    <div class="field-group">
      <div class="field-label">Email</div>
      <div class="field-value"><a href="mailto:${data.email}">${data.email}</a></div>
    </div>
    
    <div class="field-group">
      <div class="field-label">Phone</div>
      <div class="field-value">${data.phone || 'N/A'}</div>
    </div>
    
    <div class="field-group">
      <div class="field-label">Skills / Areas of Interest</div>
      <div class="field-value field-value-text">${data.skills}</div>
    </div>
    
    <div class="field-group">
      <div class="field-label">Availability</div>
      <div class="field-value field-value-text">${data.availability}</div>
    </div>
    
    <div class="field-group">
      <div class="field-label">Why do you want to join?</div>
      <div class="field-value field-value-text">${data.why || 'N/A'}</div>
    </div>
  `);

  return sendNotificationEmail({
    subject: `[Volunteer Apply] New Application from ${data.name}`,
    html,
  });
};

/**
 * Send a notification for a partnership inquiry.
 */
const sendPartnershipNotification = async (data) => {
  const html = getEmailWrapper('New Partnership Inquiry', `
    <div class="section-title">Partner Details</div>
    
    <div class="field-group">
      <div class="field-label">Company / Organisation</div>
      <div class="field-value">${data.company}</div>
    </div>
    
    <div class="field-group">
      <div class="field-label">Contact Person</div>
      <div class="field-value">${data.name}</div>
    </div>
    
    <div class="field-group">
      <div class="field-label">Email</div>
      <div class="field-value"><a href="mailto:${data.email}">${data.email}</a></div>
    </div>
    
    <div class="field-group">
      <div class="field-label">Phone</div>
      <div class="field-value">${data.phone || 'N/A'}</div>
    </div>
    
    <div class="field-group">
      <div class="field-label">Interest Areas</div>
      <div class="field-value field-value-text">${data.interest}</div>
    </div>
    
    <div class="field-group">
      <div class="field-label">Message / Details</div>
      <div class="field-value field-value-text">${data.message}</div>
    </div>
  `);

  return sendNotificationEmail({
    subject: `[Partnership Inquiry] ${data.company} - ${data.name}`,
    html,
  });
};

/**
 * Send a notification for a fundraising idea submission.
 */
const sendFundraiseNotification = async (data) => {
  const html = getEmailWrapper('New Fundraising Idea Submitted', `
    <div class="section-title">Submission Details</div>
    
    <div class="field-group">
      <div class="field-label">Submitter Name</div>
      <div class="field-value">${data.name || 'Anonymous'}</div>
    </div>
    
    <div class="field-group">
      <div class="field-label">Submitter Email</div>
      <div class="field-value">${data.email ? `<a href="mailto:${data.email}">${data.email}</a>` : 'N/A'}</div>
    </div>
    
    <div class="field-group">
      <div class="field-label">Fundraising Idea Description</div>
      <div class="field-value field-value-text">${data.idea}</div>
    </div>
  `);

  return sendNotificationEmail({
    subject: `[Fundraising Idea] New Idea Submitted${data.name ? ` by ${data.name}` : ''}`,
    html,
  });
};

module.exports = {
  sendContactNotification,
  sendVolunteerNotification,
  sendPartnershipNotification,
  sendFundraiseNotification,
};
