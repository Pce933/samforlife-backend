const express = require('express');
const { requireAdmin, createToken, verifyPassword } = require('./auth');
const {
  Contact, Volunteer, Partnership, Newsletter, FundraiseSubmission,
  PaymentTransaction, AdminUser, Story, NewsItem, TeamMember, Value,
  ProgrammeStep, FundraiseIdea, InvolvementCard, ImpactStat, SiteSettings,
  nowISO, newID
} = require('./db');

const {
  sendContactNotification,
  sendVolunteerNotification,
  sendPartnershipNotification,
  sendFundraiseNotification,
  sendContactConfirmation,
  sendVolunteerConfirmation,
  sendPartnershipConfirmation,
  sendFundraiseConfirmation,
  sendDonationNotification,
  sendDonationConfirmation
} = require('./mailer');

const router = express.Router();

// Helper to clean documents (remove _id and __v, keep id)
const clean = (doc) => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  delete obj._id;
  delete obj.__v;
  return obj;
};

// Public helper to filter list for published items
const publicList = async (model) => {
  const items = await model.find({
    $or: [{ published: true }, { published: { $exists: false } }]
  }).sort({ order: 1 });
  return items.map(clean);
};

const listAll = async (model, sortBy = 'order') => {
  const items = await model.find({}).sort({ [sortBy]: 1 });
  return items.map(clean);
};

// ===== STRIPE CONFIGURATION =====
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_DUMMY_MODE = process.env.STRIPE_DUMMY_MODE === 'true' || !STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.includes('XXXX');
const PACKAGES = { '25': 25.00, '75': 75.00, '300': 300.00 };
const MIN_CUSTOM = 1.0;
const MAX_CUSTOM = 100000.0;

// ===== PUBLIC: Health =====
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    stripe_mode: STRIPE_DUMMY_MODE ? 'dummy' : 'live_test',
    version: '2.0.0'
  });
});

// ===== PUBLIC: Read-only CMS content for website =====
router.get('/cms/all', async (req, res) => {
  try {
    // Set Cache-Control header for Vercel CDN Edge Caching (10s fresh, stale-while-revalidate for 1 hour)
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=3600');
    const [
      settingsDoc,
      stories,
      news,
      team,
      values,
      programme,
      fundraise_ideas,
      involvement,
      impact_stats
    ] = await Promise.all([
      SiteSettings.findOne({ _singleton: true }),
      publicList(Story),
      publicList(NewsItem),
      listAll(TeamMember),
      listAll(Value),
      listAll(ProgrammeStep),
      listAll(FundraiseIdea),
      listAll(InvolvementCard),
      listAll(ImpactStat)
    ]);

    const settings = settingsDoc ? clean(settingsDoc) : {};

    res.json({
      settings,
      stories,
      news,
      team,
      values,
      programme,
      fundraise_ideas,
      involvement,
      impact_stats
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ===== AUTH =====
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required' });
    }

    const user = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    const token = createToken(user.email);
    res.json({
      token,
      user: { email: user.email, name: user.name || 'Admin' }
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/auth/me', requireAdmin, (req, res) => {
  res.json(req.user);
});

// ===== FORMS SUBMISSIONS =====
router.post('/forms/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(422).json({ detail: 'Missing required fields' });
    }
    if (!email.includes('@')) {
      return res.status(422).json({ detail: 'Invalid email address' });
    }

    const doc = await Contact.create({ id: newID(), name, email, subject, message, status: 'new', created_at: nowISO() });
    
    // Fetch custom settings templates
    const settings = await SiteSettings.findOne({ _singleton: true }) || {};
    
    // Send email notification and auto-reply in parallel (await to ensure completion on Vercel)
    await Promise.all([
      sendContactNotification({ name, email, subject, message }, settings.email_contact_admin_subject)
        .catch(err => console.error('[SMTP Error] Contact notification email failed:', err)),
      sendContactConfirmation(email, name, settings.email_contact_user_subject, settings.email_contact_user_body)
        .catch(err => console.error('[SMTP Error] Contact user confirmation email failed:', err))
    ]);

    res.json({ ok: true, id: doc.id });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/forms/volunteer', async (req, res) => {
  try {
    const { name, email, phone, skills, availability, why } = req.body;
    if (!name || !email || !skills || !availability) {
      return res.status(422).json({ detail: 'Missing required fields' });
    }
    if (!email.includes('@')) {
      return res.status(422).json({ detail: 'Invalid email address' });
    }

    const doc = await Volunteer.create({ id: newID(), name, email, phone, skills, availability, why, status: 'new', created_at: nowISO() });
    
    // Fetch custom settings templates
    const settings = await SiteSettings.findOne({ _singleton: true }) || {};

    // Send email notification and auto-reply in parallel (await to ensure completion on Vercel)
    await Promise.all([
      sendVolunteerNotification({ name, email, phone, skills, availability, why }, settings.email_volunteer_admin_subject)
        .catch(err => console.error('[SMTP Error] Volunteer notification email failed:', err)),
      sendVolunteerConfirmation(email, name, settings.email_volunteer_user_subject, settings.email_volunteer_user_body)
        .catch(err => console.error('[SMTP Error] Volunteer user confirmation email failed:', err))
    ]);

    res.json({ ok: true, id: doc.id });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/forms/partnership', async (req, res) => {
  try {
    const { company, name, email, phone, interest, message } = req.body;
    if (!company || !name || !email || !interest || !message) {
      return res.status(422).json({ detail: 'Missing required fields' });
    }
    if (!email.includes('@')) {
      return res.status(422).json({ detail: 'Invalid email address' });
    }

    const doc = await Partnership.create({ id: newID(), company, name, email, phone, interest, message, status: 'new', created_at: nowISO() });
    
    // Fetch custom settings templates
    const settings = await SiteSettings.findOne({ _singleton: true }) || {};

    // Send email notification and auto-reply in parallel (await to ensure completion on Vercel)
    await Promise.all([
      sendPartnershipNotification({ company, name, email, phone, interest, message }, settings.email_partnership_admin_subject)
        .catch(err => console.error('[SMTP Error] Partnership notification email failed:', err)),
      sendPartnershipConfirmation(email, name, company, settings.email_partnership_user_subject, settings.email_partnership_user_body)
        .catch(err => console.error('[SMTP Error] Partnership user confirmation email failed:', err))
    ]);

    res.json({ ok: true, id: doc.id });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/forms/newsletter', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(422).json({ detail: 'Missing required fields' });
    }
    if (!email.includes('@')) {
      return res.status(422).json({ detail: 'Invalid email address' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await Newsletter.findOne({ email: cleanEmail });
    if (existing) {
      return res.json({ ok: true, already: true });
    }

    const doc = await Newsletter.create({ id: newID(), email: cleanEmail, active: true, created_at: nowISO() });
    res.json({ ok: true, id: doc.id });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/forms/fundraise-idea', async (req, res) => {
  try {
    const { name, email, idea } = req.body;
    if (!idea) {
      return res.status(422).json({ detail: 'Missing required fields' });
    }

    const doc = await FundraiseSubmission.create({ id: newID(), name, email, idea, status: 'new', created_at: nowISO() });
    
    // Fetch custom settings templates
    const settings = await SiteSettings.findOne({ _singleton: true }) || {};

    const emailPromises = [];

    // Send email notification to admin
    emailPromises.push(
      sendFundraiseNotification({ name, email, idea }, settings.email_fundraise_admin_subject)
        .catch(err => console.error('[SMTP Error] Fundraise notification email failed:', err))
    );

    // Send auto-reply confirmation to the fundraiser (if email is provided)
    if (email && email.trim() !== '') {
      emailPromises.push(
        sendFundraiseConfirmation(email, name, settings.email_fundraise_user_subject, settings.email_fundraise_user_body)
          .catch(err => console.error('[SMTP Error] Fundraise user confirmation email failed:', err))
      );
    }

    // Await all email promises to complete on Vercel
    await Promise.all(emailPromises);

    res.json({ ok: true, id: doc.id });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ===== ADMIN: FORMS READ & MANAGEMENT =====
router.get('/forms/admin/all', requireAdmin, async (req, res) => {
  try {
    const fetch = async (model) => {
      const items = await model.find({}).sort({ created_at: -1 });
      return items.map(clean);
    };

    res.json({
      contact: await fetch(Contact),
      volunteer: await fetch(Volunteer),
      partnership: await fetch(Partnership),
      newsletter: await fetch(Newsletter),
      fundraise_idea: await fetch(FundraiseSubmission)
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.delete('/forms/admin/:collection/:id', requireAdmin, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const colMap = {
      contact: Contact,
      volunteer: Volunteer,
      partnership: Partnership,
      newsletter: Newsletter,
      fundraise_idea: FundraiseSubmission
    };

    const model = colMap[collection];
    if (!model) {
      return res.status(404).json({ detail: 'Unknown collection' });
    }

    const result = await model.deleteOne({ id });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.patch('/forms/admin/:collection/:id/status', requireAdmin, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const { status } = req.body;
    const colMap = {
      contact: Contact,
      volunteer: Volunteer,
      partnership: Partnership,
      fundraise_idea: FundraiseSubmission
    };

    const model = colMap[collection];
    if (!model) {
      return res.status(404).json({ detail: 'Unknown collection' });
    }

    await model.updateOne({ id }, { $set: { status, updated_at: nowISO() } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ===== STRIPE PAYMENTS =====

/**
 * POST /api/payments/checkout/session
 * Creates a checkout session (real Stripe or dummy simulation)
 */
router.post('/payments/checkout/session', async (req, res) => {
  try {
    const { package_id, custom_amount, frequency, name, email, origin_url } = req.body;

    // Resolve amount
    let amount = 0;
    if (package_id && PACKAGES[package_id]) {
      amount = PACKAGES[package_id];
    } else if (custom_amount !== undefined && custom_amount !== null) {
      amount = parseFloat(custom_amount);
      if (isNaN(amount) || amount < MIN_CUSTOM || amount > MAX_CUSTOM) {
        return res.status(400).json({ detail: `Amount must be between ${MIN_CUSTOM} and ${MAX_CUSTOM}` });
      }
    } else {
      return res.status(400).json({ detail: 'Either package_id or custom_amount is required' });
    }

    if (frequency !== 'one-time' && frequency !== 'monthly') {
      return res.status(400).json({ detail: 'Invalid frequency' });
    }

    const baseUrl = (origin_url || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const sessionId = `mock_session_${Date.now()}_${amount}`;

    const successUrl = `${baseUrl}/get-involved/donate?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = `${baseUrl}/get-involved/donate?cancelled=1`;

    const metadata = {
      amount_gbp: amount.toFixed(2),
      frequency,
      donor_name: name || '',
      donor_email: email || '',
      source: 'sam_for_life_donate',
    };

    let checkoutUrl;

    if (STRIPE_DUMMY_MODE) {
      // ----------------------------------------------------------------
      // DUMMY MODE: redirect to our built-in mock Stripe checkout page
      // ----------------------------------------------------------------
      const resolvedSessionId = sessionId;
      // The dummy checkout page lives at /api/stripe/dummy-checkout
      const dummyParams = new URLSearchParams({
        session_id: resolvedSessionId,
        amount: amount.toFixed(2),
        frequency,
        donor_name: name || '',
        donor_email: email || '',
        success_url: successUrl.replace('{CHECKOUT_SESSION_ID}', resolvedSessionId),
        cancel_url: cancelUrl
      });
      checkoutUrl = `${req.protocol}://${req.get('host')}/api/stripe/dummy-checkout?${dummyParams}`;

      // Store transaction
      await PaymentTransaction.create({
        id: newID(),
        session_id: resolvedSessionId,
        amount,
        currency: 'gbp',
        frequency,
        donor_name: name || '',
        donor_email: email || '',
        metadata,
        payment_status: 'initiated',
        status: 'open',
        created_at: nowISO()
      });

      return res.json({ url: checkoutUrl, session_id: resolvedSessionId });

    } else {
      // ----------------------------------------------------------------
      // REAL STRIPE MODE
      // ----------------------------------------------------------------
      const stripe = require('stripe')(STRIPE_SECRET_KEY);

      const priceData = {
        currency: 'gbp',
        product_data: {
          name: `SAM for Life Donation - ${frequency === 'monthly' ? 'Monthly' : 'One-time'}`,
          description: `Thank you for supporting SAM for Life!`,
        },
        unit_amount: Math.round(amount * 100),
      };

      if (frequency === 'monthly') {
        priceData.recurring = { interval: 'month' };
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price_data: priceData, quantity: 1 }],
        mode: frequency === 'monthly' ? 'subscription' : 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: email || undefined,
        metadata
      });

      // Store transaction
      await PaymentTransaction.create({
        id: newID(),
        session_id: session.id,
        amount,
        currency: 'gbp',
        frequency,
        donor_name: name || '',
        donor_email: email || '',
        metadata,
        payment_status: 'initiated',
        status: 'open',
        created_at: nowISO()
      });

      return res.json({ url: session.url, session_id: session.id });
    }
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * Helper to finalize a paid transaction by updating database flags and sending email receipts.
 */
const processPaidTransaction = async (session_id) => {
  try {
    const txn = await PaymentTransaction.findOne({ session_id });
    if (!txn || txn.payment_status !== 'paid' || txn.receipt_sent === true) {
      return;
    }

    // Set flag and save
    txn.receipt_sent = true;
    txn.updated_at = nowISO();
    
    if (txn.save) {
      await txn.save();
    } else {
      await PaymentTransaction.updateOne({ session_id }, { $set: { receipt_sent: true, updated_at: nowISO() } });
    }

    // Fetch SMTP templates
    const settings = await SiteSettings.findOne({ _singleton: true }) || {};

    const donationData = {
      name: txn.donor_name || 'Anonymous',
      email: txn.donor_email || '',
      amount: txn.amount,
      frequency: txn.frequency,
      transaction_id: txn.session_id
    };

    const emailPromises = [];

    // Trigger Admin Alert (if configured)
    emailPromises.push(
      sendDonationNotification(donationData, settings.email_donation_admin_subject)
        .catch(err => console.error('[SMTP Error] Donation notification email failed to send:', err))
    );

    // Trigger Donor Confirmation Email (if donor email is available)
    if (txn.donor_email && txn.donor_email.trim() !== '') {
      emailPromises.push(
        sendDonationConfirmation(
          txn.donor_email,
          txn.donor_name,
          txn.amount,
          txn.frequency,
          txn.session_id,
          settings.email_donation_user_subject,
          settings.email_donation_user_body
        ).catch(err => console.error('[SMTP Error] Donation user confirmation email failed to send:', err))
      );
    }

    // Await all emails to ensure Vercel doesn't freeze the environment before they complete
    await Promise.all(emailPromises);

    console.log(`[Payments] Successfully processed email notifications for transaction ${session_id}`);
  } catch (err) {
    console.error('[Payments] Failed to process email receipt notifications:', err);
  }
};

/**
 * GET /api/payments/checkout/status/:session_id
 * Returns payment status for a session
 */
router.get('/payments/checkout/status/:session_id', async (req, res) => {
  try {
    const { session_id } = req.params;
    const isMockSession = session_id.startsWith('mock_session_');

    // Return cached result if already paid
    const existing = await PaymentTransaction.findOne({ session_id });
    if (existing && existing.payment_status === 'paid') {
      // Trigger emails just in case it was not processed yet (e.g. if previous send failed)
      if (existing.receipt_sent !== true) {
        await processPaidTransaction(session_id);
      }
      return res.json({
        session_id,
        status: existing.status,
        payment_status: existing.payment_status,
        amount_total: Math.round(existing.amount * 100),
        currency: existing.currency,
        already_processed: true
      });
    }

    let status, paymentStatus, amountTotal, currency, metadata;

    if (isMockSession || STRIPE_DUMMY_MODE) {
      // Parse amount from session ID: mock_session_{timestamp}_{amount}
      const parts = session_id.split('_');
      const amount = parseFloat(parts[parts.length - 1]) || 10;
      status = 'complete';
      paymentStatus = 'paid';
      amountTotal = Math.round(amount * 100);
      currency = 'gbp';
      metadata = existing ? existing.metadata : {};
    } else {
      const stripe = require('stripe')(STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(session_id);
      status = session.status;
      paymentStatus = session.payment_status;
      amountTotal = session.amount_total;
      currency = session.currency;
      metadata = session.metadata;
    }

    // Update transaction record
    await PaymentTransaction.updateOne({ session_id }, {
      $set: {
        status,
        payment_status: paymentStatus,
        updated_at: nowISO()
      }
    });

    // If status is paid, trigger receipt emails
    if (paymentStatus === 'paid') {
      await processPaidTransaction(session_id);
    }

    res.json({
      session_id,
      status,
      payment_status: paymentStatus,
      amount_total: amountTotal,
      currency,
      metadata
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET /api/payments/admin/transactions
 * Admin: list all payment transactions
 */
router.get('/payments/admin/transactions', requireAdmin, async (req, res) => {
  try {
    const txns = await PaymentTransaction.find({}).sort({ created_at: -1 });
    res.json(txns.map(clean));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET /api/stripe/config
 * Returns Stripe publishable key for frontend
 */
router.get('/stripe/config', (req, res) => {
  res.json({
    publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || '',
    dummy_mode: STRIPE_DUMMY_MODE,
    test_cards: STRIPE_DUMMY_MODE ? [
      { number: '4242 4242 4242 4242', brand: 'Visa', result: 'Success' },
      { number: '4000 0000 0000 0002', brand: 'Visa', result: 'Decline' },
      { number: '5555 5555 5555 4444', brand: 'Mastercard', result: 'Success' },
    ] : []
  });
});

/**
 * GET /api/stripe/dummy-checkout
 * Renders a beautiful mock Stripe checkout page for testing
 */
router.get('/stripe/dummy-checkout', (req, res) => {
  const { session_id, amount, frequency, donor_name, donor_email, success_url, cancel_url } = req.query;

  const amountGBP = parseFloat(amount || 0).toFixed(2);
  const freqLabel = frequency === 'monthly' ? 'Monthly Donation' : 'One-time Donation';

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SAM for Life – Secure Payment</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --stripe-blue: #635bff;
      --stripe-blue-dark: #4f46e5;
      --success: #00d924;
      --danger: #ff4444;
      --bg: #f6f9fc;
      --card-bg: #ffffff;
      --text: #1a1a2e;
      --muted: #6b7280;
      --border: #e5e7eb;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .checkout-wrapper {
      width: 100%;
      max-width: 460px;
      animation: fadeIn 0.4s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .stripe-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 20px;
      color: var(--muted);
      font-size: 13px;
    }

    .stripe-badge svg { width: 40px; }

    .card {
      background: var(--card-bg);
      border-radius: 16px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.10);
      overflow: hidden;
    }

    .card-header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      padding: 28px 32px 24px;
      color: white;
    }

    .org-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }

    .org-logo .icon {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
    }

    .org-logo .name { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
    .org-logo .tagline { font-size: 12px; color: rgba(255,255,255,0.6); }

    .amount-display {
      margin-top: 8px;
    }

    .amount-display .label {
      font-size: 12px;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .amount-display .value {
      font-size: 42px;
      font-weight: 700;
      letter-spacing: -2px;
      line-height: 1;
    }

    .amount-display .freq {
      font-size: 14px;
      color: rgba(255,255,255,0.6);
      margin-top: 6px;
    }

    .test-banner {
      background: linear-gradient(90deg, #635bff22, #635bff11);
      border: 1px solid #635bff44;
      border-radius: 8px;
      padding: 10px 14px;
      margin-top: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: #a5b4fc;
    }

    .test-banner .dot {
      width: 8px; height: 8px;
      background: #635bff;
      border-radius: 50%;
      animation: pulse 1.5s ease-in-out infinite;
      flex-shrink: 0;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.4); opacity: 0.7; }
    }

    .card-body { padding: 28px 32px; }

    .donor-info {
      background: #f8fafc;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 24px;
      font-size: 13px;
      color: var(--muted);
    }

    .donor-info .row { display: flex; justify-content: space-between; align-items: center; }
    .donor-info .row + .row { margin-top: 6px; }
    .donor-info .val { color: var(--text); font-weight: 500; }

    .section-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 12px;
    }

    .form-group { margin-bottom: 16px; }

    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
      margin-bottom: 6px;
    }

    .form-input {
      width: 100%;
      padding: 11px 14px;
      border: 1.5px solid var(--border);
      border-radius: 8px;
      font-size: 15px;
      font-family: 'Inter', monospace;
      color: var(--text);
      background: white;
      transition: border-color 0.2s, box-shadow 0.2s;
      outline: none;
    }

    .form-input:focus {
      border-color: var(--stripe-blue);
      box-shadow: 0 0 0 3px rgba(99,91,255,0.12);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .test-cards {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 20px;
    }

    .test-cards .title {
      font-size: 12px;
      font-weight: 600;
      color: #92400e;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .test-card-item {
      font-size: 12px;
      color: #78350f;
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
    }

    .test-card-item .num { font-family: monospace; font-weight: 600; cursor: pointer; }
    .test-card-item .num:hover { color: #1d4ed8; text-decoration: underline; }
    .test-card-item .badge {
      padding: 1px 8px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
    }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-fail { background: #fee2e2; color: #991b1b; }

    .btn {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-family: 'Inter', sans-serif;
    }

    .btn-pay {
      background: linear-gradient(135deg, var(--stripe-blue), var(--stripe-blue-dark));
      color: white;
      margin-bottom: 10px;
      position: relative;
      overflow: hidden;
    }

    .btn-pay:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,91,255,0.4); }
    .btn-pay:active { transform: translateY(0); }

    .btn-pay.loading {
      pointer-events: none;
      opacity: 0.8;
    }

    .btn-pay .spinner {
      display: none;
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin: 0 auto;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .btn-pay.loading .btn-text { display: none; }
    .btn-pay.loading .spinner { display: block; }

    .btn-cancel {
      background: transparent;
      color: var(--muted);
      border: 1.5px solid var(--border);
      font-size: 14px;
    }

    .btn-cancel:hover { background: var(--bg); color: var(--text); }

    .security-note {
      text-align: center;
      font-size: 11px;
      color: var(--muted);
      margin-top: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }

    /* Success overlay */
    .success-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .success-overlay.show { display: flex; }

    .success-card {
      background: white;
      border-radius: 20px;
      padding: 40px;
      text-align: center;
      max-width: 360px;
      width: 90%;
      animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
    }

    @keyframes popIn {
      from { opacity: 0; transform: scale(0.7); }
      to   { opacity: 1; transform: scale(1); }
    }

    .success-icon {
      width: 72px; height: 72px;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 36px;
      animation: checkPop 0.5s ease 0.2s both;
    }

    @keyframes checkPop {
      from { transform: scale(0); }
      to   { transform: scale(1); }
    }

    .success-card h2 { font-size: 22px; color: var(--text); margin-bottom: 8px; }
    .success-card p { font-size: 14px; color: var(--muted); line-height: 1.6; margin-bottom: 6px; }
    .success-card .amount-confirm { font-size: 32px; font-weight: 700; color: #16a34a; margin: 12px 0; }
    .success-card .redirect-note { font-size: 12px; color: var(--muted); margin-top: 16px; }
    .countdown { font-weight: 700; color: var(--stripe-blue); }

    /* Decline overlay */
    .decline-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .decline-overlay.show { display: flex; }

    .decline-card {
      background: white;
      border-radius: 20px;
      padding: 40px;
      text-align: center;
      max-width: 360px;
      width: 90%;
      animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
    }

    .decline-icon {
      width: 72px; height: 72px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 36px;
    }

    .decline-card h2 { font-size: 22px; color: var(--text); margin-bottom: 8px; }
    .decline-card p { font-size: 14px; color: var(--muted); line-height: 1.6; }

    .btn-try-again {
      margin-top: 20px;
      background: linear-gradient(135deg, var(--stripe-blue), var(--stripe-blue-dark));
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
    }
  </style>
</head>
<body>

<div class="checkout-wrapper">
  <div class="stripe-badge">
    <svg viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="20" font-family="Arial" font-size="16" fill="#635bff" font-weight="bold">stripe</text>
    </svg>
    <span>TEST MODE — Simulated Checkout</span>
  </div>

  <div class="card">
    <div class="card-header">
      <div class="org-logo">
        <div class="icon">❤️</div>
        <div>
          <div class="name">SAM for Life</div>
          <div class="tagline">Secure Donation</div>
        </div>
      </div>

      <div class="amount-display">
        <div class="label">Amount Due</div>
        <div class="value">£${amountGBP}</div>
        <div class="freq">${freqLabel}</div>
      </div>

      <div class="test-banner">
        <div class="dot"></div>
        <span><strong>Test Mode Active</strong> — No real charges will occur. Use test card numbers below.</span>
      </div>
    </div>

    <div class="card-body">
      ${donor_name || donor_email ? `
      <div class="donor-info">
        ${donor_name ? `<div class="row"><span>Donor</span><span class="val">${donor_name}</span></div>` : ''}
        ${donor_email ? `<div class="row"><span>Email</span><span class="val">${donor_email}</span></div>` : ''}
      </div>` : ''}

      <div class="test-cards">
        <div class="title">🧪 Test Card Numbers</div>
        <div class="test-card-item">
          <span class="num" onclick="fillCard('4242424242424242')">4242 4242 4242 4242</span>
          <span class="badge badge-success">✓ Success</span>
        </div>
        <div class="test-card-item">
          <span class="num" onclick="fillCard('4000000000000002')">4000 0000 0000 0002</span>
          <span class="badge badge-fail">✗ Declined</span>
        </div>
        <div class="test-card-item">
          <span class="num" onclick="fillCard('5555555555554444')">5555 5555 5555 4444</span>
          <span class="badge badge-success">✓ Mastercard</span>
        </div>
        <div style="font-size:11px;color:#92400e;margin-top:6px;">Use any future date & any 3-digit CVC</div>
      </div>

      <div class="section-label">Card Details</div>

      <div class="form-group">
        <label class="form-label">Card Number</label>
        <input id="cardNumber" class="form-input" type="text" placeholder="1234 5678 9012 3456"
               maxlength="19" autocomplete="cc-number" oninput="formatCard(this)">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Expiry Date</label>
          <input id="expiry" class="form-input" type="text" placeholder="MM / YY"
                 maxlength="7" oninput="formatExpiry(this)">
        </div>
        <div class="form-group">
          <label class="form-label">CVC</label>
          <input id="cvc" class="form-input" type="text" placeholder="123" maxlength="3">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Name on Card</label>
        <input id="cardName" class="form-input" type="text" placeholder="Full name"
               value="${donor_name || ''}">
      </div>

      <button class="btn btn-pay" id="payBtn" onclick="processPayment()">
        <span class="btn-text">Pay £${amountGBP}</span>
        <div class="spinner"></div>
      </button>

      <button class="btn btn-cancel" onclick="cancelPayment()">Cancel & Return</button>

      <div class="security-note">
        🔒 Secured by Stripe · TLS Encrypted · PCI DSS Compliant
      </div>
    </div>
  </div>
</div>

<!-- Success overlay -->
<div class="success-overlay" id="successOverlay">
  <div class="success-card">
    <div class="success-icon">✓</div>
    <h2>Payment Successful!</h2>
    <div class="amount-confirm">£${amountGBP}</div>
    <p>Thank you${donor_name ? ', <strong>' + donor_name + '</strong>' : ''}! Your ${freqLabel.toLowerCase()} has been processed.</p>
    <p style="margin-top:8px;">A confirmation will be sent to ${donor_email || 'your email'}.</p>
    <div class="redirect-note">Redirecting in <span class="countdown" id="countdown">3</span>s...</div>
  </div>
</div>

<!-- Decline overlay -->
<div class="decline-overlay" id="declineOverlay">
  <div class="decline-card">
    <div class="decline-icon">✗</div>
    <h2>Card Declined</h2>
    <p>Your card was declined. Please try a different card or contact your bank.</p>
    <button class="btn-try-again" onclick="hideDecline()">Try Again</button>
  </div>
</div>

<script>
  const SESSION_ID = '${session_id}';
  const SUCCESS_URL = ${JSON.stringify(success_url || '')};
  const CANCEL_URL = ${JSON.stringify(cancel_url || '')};
  const DECLINED_CARD = '4000000000000002';

  function fillCard(num) {
    const formatted = num.replace(/(\\d{4})/g, '$1 ').trim();
    document.getElementById('cardNumber').value = formatted;
    document.getElementById('expiry').value = '12 / 28';
    document.getElementById('cvc').value = '123';
  }

  function formatCard(input) {
    let v = input.value.replace(/\\D/g, '').substring(0, 16);
    input.value = v.replace(/(\\d{4})(?=\\d)/g, '$1 ');
  }

  function formatExpiry(input) {
    let v = input.value.replace(/\\D/g, '').substring(0, 4);
    if (v.length >= 2) v = v.substring(0, 2) + ' / ' + v.substring(2);
    input.value = v;
  }

  function cancelPayment() {
    window.location.href = CANCEL_URL || '/';
  }

  function hideDecline() {
    document.getElementById('declineOverlay').classList.remove('show');
  }

  async function processPayment() {
    const cardNumber = document.getElementById('cardNumber').value.replace(/\\s/g, '');
    const expiry = document.getElementById('expiry').value.trim();
    const cvc = document.getElementById('cvc').value.trim();

    // Basic validation
    if (cardNumber.length < 13) {
      alert('Please enter a valid card number.');
      return;
    }
    if (!expiry) {
      alert('Please enter the expiry date.');
      return;
    }
    if (cvc.length < 3) {
      alert('Please enter a valid CVC.');
      return;
    }

    const btn = document.getElementById('payBtn');
    btn.classList.add('loading');

    // Simulate processing delay
    await new Promise(r => setTimeout(r, 1800));

    // Check if declined card
    if (cardNumber === DECLINED_CARD) {
      btn.classList.remove('loading');
      document.getElementById('declineOverlay').classList.add('show');
      return;
    }

    // Mark session as paid in backend
    try {
      await fetch('/api/payments/checkout/status/' + SESSION_ID);
    } catch(e) { /* ignore */ }

    btn.classList.remove('loading');

    // Show success
    document.getElementById('successOverlay').classList.add('show');

    // Countdown & redirect
    let count = 3;
    const countEl = document.getElementById('countdown');
    const timer = setInterval(() => {
      count--;
      countEl.textContent = count;
      if (count <= 0) {
        clearInterval(timer);
        if (SUCCESS_URL) {
          window.location.href = SUCCESS_URL;
        }
      }
    }, 1000);
  }
</script>
</body>
</html>`);
});

// ===== Stripe Webhook =====
router.post('/webhook/stripe', async (req, res) => {
  try {
    if (STRIPE_DUMMY_MODE) {
      return res.json({ received: true });
    }

    const stripe = require('stripe')(STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      return res.status(400).json({ detail: `Webhook Error: ${err.message}` });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await PaymentTransaction.updateOne({ session_id: session.id }, {
        $set: {
          payment_status: session.payment_status,
          status: session.status,
          updated_at: nowISO()
        }
      });
      if (session.payment_status === 'paid') {
        await processPaidTransaction(session.id);
      }
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ===== ADMIN: CMS SETTINGS =====
router.get('/cms/admin/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await SiteSettings.findOne({ _singleton: true }) || {};
    res.json(clean(settings));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/cms/admin/settings', requireAdmin, async (req, res) => {
  try {
    const updateDoc = { ...req.body, updated_at: nowISO() };
    delete updateDoc.id;
    delete updateDoc._id;
    delete updateDoc._singleton;

    await SiteSettings.updateOne({ _singleton: true }, { $set: updateDoc }, { upsert: true });
    const out = await SiteSettings.findOne({ _singleton: true });
    res.json(clean(out));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ===== ADMIN: CMS GENERIC CRUD =====
const cmsCollections = {
  stories: Story,
  news: NewsItem,
  team: TeamMember,
  values: Value,
  programme: ProgrammeStep,
  fundraise: FundraiseIdea,
  involvement: InvolvementCard,
  impact: ImpactStat
};

router.get('/cms/admin/:collection', requireAdmin, async (req, res) => {
  try {
    const { collection } = req.params;
    const model = cmsCollections[collection];
    if (!model) return res.status(404).json({ detail: 'Collection not found' });
    res.json(await listAll(model));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/cms/admin/:collection', requireAdmin, async (req, res) => {
  try {
    const { collection } = req.params;
    const model = cmsCollections[collection];
    if (!model) return res.status(404).json({ detail: 'Collection not found' });

    const doc = {
      ...req.body,
      id: newID(),
      created_at: nowISO()
    };
    const created = await model.create(doc);
    res.status(201).json(clean(created));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/cms/admin/:collection/:id', requireAdmin, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const model = cmsCollections[collection];
    if (!model) return res.status(404).json({ detail: 'Collection not found' });

    const updateDoc = { ...req.body, updated_at: nowISO() };
    delete updateDoc.id;
    delete updateDoc._id;

    const result = await model.updateOne({ id }, { $set: updateDoc });
    if (result.matchedCount === 0) {
      return res.status(404).json({ detail: 'Not found' });
    }

    const updated = await model.findOne({ id });
    res.json(clean(updated));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.delete('/cms/admin/:collection/:id', requireAdmin, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const model = cmsCollections[collection];
    if (!model) return res.status(404).json({ detail: 'Collection not found' });

    const result = await model.deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ detail: 'Not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
