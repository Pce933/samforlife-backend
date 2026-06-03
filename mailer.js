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
 * Helper to replace curly brace placeholders `{key}` in templates with data values.
 */
const replacePlaceholders = (template, data) => {
  if (!template) return '';
  let result = template;
  for (const key in data) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), data[key] || '');
  }
  return result;
};

/**
 * Send a notification for a contact submission.
 */
const sendContactNotification = async (data, customSubject) => {
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

  const subjectTemplate = customSubject || '[Contact Form] {subject} - from {name}';
  return sendNotificationEmail({
    subject: replacePlaceholders(subjectTemplate, data),
    html,
  });
};

/**
 * Send a notification for a volunteer application.
 */
const sendVolunteerNotification = async (data, customSubject) => {
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

  const subjectTemplate = customSubject || '[Volunteer Apply] New Application from {name}';
  return sendNotificationEmail({
    subject: replacePlaceholders(subjectTemplate, data),
    html,
  });
};

/**
 * Send a notification for a partnership inquiry.
 */
const sendPartnershipNotification = async (data, customSubject) => {
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

  const subjectTemplate = customSubject || '[Partnership Inquiry] {company} - {name}';
  return sendNotificationEmail({
    subject: replacePlaceholders(subjectTemplate, data),
    html,
  });
};

/**
 * Send a notification for a fundraising idea submission.
 */
const sendFundraiseNotification = async (data, customSubject) => {
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

  const subjectTemplate = customSubject || '[Fundraising Idea] New Idea Submitted by {name}';
  return sendNotificationEmail({
    subject: replacePlaceholders(subjectTemplate, data),
    html,
  });
};

/**
 * Send an email confirmation to the visitor (end-user).
 */
const sendUserEmail = async ({ to, subject, html }) => {
  if (!transporter) {
    console.warn('[Mailer] SMTP is unconfigured. Simulated End-User Email Log:');
    console.warn('----------------------------------------------------');
    console.warn(`TO: ${to}`);
    console.warn(`SUBJECT: ${subject}`);
    console.warn('----------------------------------------------------');
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
    });
    console.log(`[Mailer] User confirmation email sent successfully to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Mailer] Error sending user confirmation email to ${to}:`, err);
    return { success: false, error: err.message };
  }
};

/**
 * Send an email confirmation to the contact form submitter.
 */
const sendContactConfirmation = async (email, name, customSubject, customBody) => {
  const subjectTemplate = customSubject || 'We have received your message - SAM for Life';
  const defaultBody = `<p>Dear {name},</p>\n<p>Thank you for reaching out to us at <strong>SAM for Life</strong>.</p>\n<p>We wanted to let you know that we have successfully received your message. Our team is currently reviewing it and will get back to you as soon as possible (usually within 1-2 business days).</p>\n<p>In the meantime, feel free to browse our website to learn more about our programmes and the impact we are making together.</p>\n<br>\n<p>Warm regards,</p>\n<p><strong>The SAM for Life Team</strong></p>`;
  const bodyTemplate = customBody || defaultBody;

  const data = { name, email };
  const html = getEmailWrapper('Message Received - SAM for Life', `
    <div style="font-size: 15px; line-height: 1.6; color: #334155;">
      ${replacePlaceholders(bodyTemplate, data)}
    </div>
  `);

  return sendUserEmail({
    to: email,
    subject: replacePlaceholders(subjectTemplate, data),
    html,
  });
};

/**
 * Send an email confirmation to the volunteer applicant.
 */
const sendVolunteerConfirmation = async (email, name, customSubject, customBody) => {
  const subjectTemplate = customSubject || 'Thank you for your Volunteer Application - SAM for Life';
  const defaultBody = `<p>Dear {name},</p>\n<p>Thank you for your interest in volunteering with <strong>SAM for Life</strong>! We are incredibly grateful for your willingness to dedicate your time and skills to support our mission.</p>\n<p>This is to confirm that we have received your application. Our volunteer coordinator will review your profile, skills, and availability, and contact you shortly to schedule an onboarding chat or discuss potential opportunities.</p>\n<p>Thank you once again for your support and for joining hands with us.</p>\n<br>\n<p>Warm regards,</p>\n<p><strong>The SAM for Life Team</strong></p>`;
  const bodyTemplate = customBody || defaultBody;

  const data = { name, email };
  const html = getEmailWrapper('Volunteer Application Received - SAM for Life', `
    <div style="font-size: 15px; line-height: 1.6; color: #334155;">
      ${replacePlaceholders(bodyTemplate, data)}
    </div>
  `);

  return sendUserEmail({
    to: email,
    subject: replacePlaceholders(subjectTemplate, data),
    html,
  });
};

/**
 * Send an email confirmation to the partnership inquirer.
 */
const sendPartnershipConfirmation = async (email, name, company, customSubject, customBody) => {
  const subjectTemplate = customSubject || 'Partnership Inquiry Received - SAM for Life';
  const defaultBody = `<p>Dear {name},</p>\n<p>Thank you for contacting us regarding a potential partnership between <strong>{company}</strong> and <strong>SAM for Life</strong>.</p>\n<p>We are excited about the possibility of collaborating to drive positive impact. We have received your partnership inquiry, and our development team will review the details and get in touch with you shortly to explore next steps.</p>\n<p>If you have any supporting documents or additional details to share in the meantime, feel free to reply directly to this email.</p>\n<br>\n<p>Warm regards,</p>\n<p><strong>The SAM for Life Team</strong></p>`;
  const bodyTemplate = customBody || defaultBody;

  const data = { name, email, company };
  const html = getEmailWrapper('Partnership Inquiry Received - SAM for Life', `
    <div style="font-size: 15px; line-height: 1.6; color: #334155;">
      ${replacePlaceholders(bodyTemplate, data)}
    </div>
  `);

  return sendUserEmail({
    to: email,
    subject: replacePlaceholders(subjectTemplate, data),
    html,
  });
};

/**
 * Send an email confirmation to the fundraising idea submitter.
 */
const sendFundraiseConfirmation = async (email, name, customSubject, customBody) => {
  const subjectTemplate = customSubject || 'Thank you for your Fundraising Idea - SAM for Life';
  const defaultBody = `<p>Dear {name},</p>\n<p>Thank you for submitting your fundraising idea to <strong>SAM for Life</strong>! We love creative and passionate ideas that help raise awareness and support for our cause.</p>\n<p>We have successfully received your idea, and our team will review it. We appreciate you taking the initiative to help fundraise for us.</p>\n<br>\n<p>Warm regards,</p>\n<p><strong>The SAM for Life Team</strong></p>`;
  const bodyTemplate = customBody || defaultBody;

  const data = { name, email };
  const html = getEmailWrapper('Fundraising Idea Received - SAM for Life', `
    <div style="font-size: 15px; line-height: 1.6; color: #334155;">
      ${replacePlaceholders(bodyTemplate, data)}
    </div>
  `);

  return sendUserEmail({
    to: email,
    subject: replacePlaceholders(subjectTemplate, data),
    html,
  });
};

module.exports = {
  sendContactNotification,
  sendVolunteerNotification,
  sendPartnershipNotification,
  sendFundraiseNotification,
  sendContactConfirmation,
  sendVolunteerConfirmation,
  sendPartnershipConfirmation,
  sendFundraiseConfirmation,
};
