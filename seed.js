const {
  Contact, Volunteer, Partnership, Newsletter, FundraiseSubmission,
  PaymentTransaction, AdminUser, Story, NewsItem, TeamMember, Value,
  ProgrammeStep, FundraiseIdea, InvolvementCard, ImpactStat, SiteSettings,
  nowISO, newID
} = require('./db');
const { hashPassword } = require('./auth');

const DEFAULT_STORIES = [
  {
    key: 'aisha', name: 'Aisha', age: 19,
    role: 'barista trainee at a local café',
    quote: "Before SAM, I thought a job wasn't for someone like me. Now I make coffees for the whole street — and they all know my name.",
    image: 'https://images.unsplash.com/photo-1768096043738-0675e58ddbdd?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',
    teller: "Aisha's mum, Naomi",
    body: 'Aisha came to SAM for Life at 17 with a autism spectrum diagnosis and very little confidence. Today, Aisha works as a barista trainee at a local café, and is one of the brightest stars in our community.',
    order: 1, published: true
  },
  {
    key: 'daniel', name: 'Daniel', age: 22,
    role: 'warehouse assistant with a national retailer',
    quote: 'I love work. I love my mates. I love payday. I am proud of me.',
    image: 'https://images.unsplash.com/photo-1771054244002-4445dc1da2eb?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',
    teller: "Daniel's dad, Marcus",
    body: 'Daniel came to SAM for Life at 20 with a Down syndrome diagnosis and very little confidence. Today, Daniel works as a warehouse assistant with a national retailer, and is one of the brightest stars in our community.',
    order: 2, published: true
  },
  {
    key: 'priya', name: 'Priya', age: 17,
    role: 'digital marketing apprentice',
    quote: 'My coach told me my brain works differently — not less. That sentence changed my life.',
    image: 'https://images.unsplash.com/photo-1593113565214-80afcb4dd192?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',
    teller: "Priya's foster carer, Eleanor",
    body: 'Priya came to SAM for Life at 15 with a learning difference diagnosis and very little confidence. Today, Priya works as a digital marketing apprentice, and is one of the brightest stars in our community.',
    order: 3, published: true
  }
];

const DEFAULT_NEWS = [
  { date: '1 February 2026', tag: 'ANNOUNCEMENT', title: 'SAM for Life officially launches',
    desc: 'After two years of pilot work, we are opening our doors to families and employer partners across the UK.', order: 1, published: true },
  { date: '18 January 2026', tag: 'PARTNERSHIP', title: 'New partnership with The Daily Brew café chain',
    desc: 'Twelve new barista placement opportunities open this spring across London and Manchester.', order: 2, published: true },
  { date: '12 December 2025', tag: 'RESEARCH', title: 'Research report: the cost of exclusion',
    desc: 'Our first impact paper explores the lifelong economic and human cost of leaving young people behind.', order: 3, published: true }
];

const DEFAULT_TEAM = [
  { initials: 'SO', name: 'Samira Okafor', role: 'Founder & CEO', bio: 'A former SEND coordinator who saw too many young people fall through the cracks after school.', order: 1 },
  { initials: 'JW', name: 'James Whitfield', role: 'Programme Director', bio: 'Twenty years in supported employment. Believes ordinary jobs change extraordinary lives.', order: 2 },
  { initials: 'DLH', name: 'Dr Lara Henderson', role: 'Trustee, Clinical Lead', bio: 'Educational psychologist with a focus on neurodiversity and transition.', order: 3 },
  { initials: 'TA', name: 'Tunde Adeleke', role: 'Trustee, Employer Network', bio: 'Former HR director championing inclusive hiring across UK retail and hospitality.', order: 4 }
];

const DEFAULT_VALUES = [
  { title: 'Dignity First', desc: 'We see the person, not the diagnosis. Every interaction starts with respect.', order: 1 },
  { title: 'Possibility Thinking', desc: 'We focus on what young people can do — and build everything from there.', order: 2 },
  { title: 'Partnership', desc: 'We work alongside families, schools, and employers as one team.', order: 3 },
  { title: 'Accountability', desc: 'We measure our impact in real outcomes — and share it openly.', order: 4 }
];

const DEFAULT_PROGRAMME = [
  {
    key: 'skills-for-life', eyebrow: 'The foundation', title: 'Skills for Life',
    desc: 'Practical workshops for young people aged 14–25 covering communication, digital literacy, money management, CV writing and emotional resilience.',
    icon: 'graduation', image: 'https://images.unsplash.com/photo-1768096043738-0675e58ddbdd?crop=entropy&cs=srgb&fm=jpg&q=85&w=900',
    bullets: ['Communication & social confidence', 'Digital literacy (email, basic computing, social media safety)', 'Money management & independence', 'CV writing & interview preparation', 'Emotional resilience & self-advocacy'],
    order: 1
  },
  {
    key: 'work-pathways', eyebrow: 'Theory meets reality', title: 'Work Pathways',
    desc: "Supported work placements tailored to each young person's strengths. A dedicated job coach accompanies every placement.",
    icon: 'briefcase', image: 'https://images.unsplash.com/photo-1771054244002-4445dc1da2eb?crop=entropy&cs=srgb&fm=jpg&q=85&w=900',
    bullets: [], order: 2
  },
  {
    key: 'employer-partners', eyebrow: 'Inclusive hiring, smart business', title: 'Employer Partners',
    desc: 'We match you with the right young person, prepare your team, and stay close while the placement settles. You simply open the door.',
    icon: 'building', image: 'https://images.unsplash.com/photo-1593113565214-80afcb4dd192?crop=entropy&cs=srgb&fm=jpg&q=85&w=900',
    bullets: ['Higher team morale and retention', 'Improved customer relations and brand reputation', 'Fresh perspectives that drive innovation', 'Hands-on CSR with measurable, human outcomes'],
    order: 3
  }
];

const DEFAULT_FUNDRAISE = [
  { icon: 'footprints', title: 'Sponsored walk or run', desc: "Pull on your trainers and rally your friends. We'll send sponsorship forms and a SAM t-shirt.", order: 1 },
  { icon: 'cake', title: 'Bake sale or coffee morning', desc: 'A morning of cake, conversation, and quiet impact. Workplace-friendly and family-friendly.', order: 2 },
  { icon: 'bike', title: 'Cycle, swim or shave!', desc: "Big challenge, big difference. We'll help with social posts and a donation page.", order: 3 },
  { icon: 'sparkles', title: 'Celebrate in lieu of gifts', desc: 'Birthdays, weddings, milestones — ask loved ones to give in your name.', order: 4 }
];

const DEFAULT_INVOLVEMENT = [
  { key: 'donate', icon: 'heart', title: 'Donate', desc: '£25 funds one workshop. £75 a month of coaching. £300 supports a full placement.', to: '/get-involved/donate', order: 1 },
  { key: 'volunteer', icon: 'users', title: 'Volunteer', desc: 'Mentor a young person, run a workshop, or coach in-placement. Apply online.', to: '/get-involved/volunteer', order: 2 },
  { key: 'partnership', icon: 'handshake', title: 'Corporate Partnership', desc: 'Host placements, run team volunteering days, and co-fundraise with us.', to: '/get-involved/partnership', order: 3 },
  { key: 'fundraise', icon: 'trophy', title: 'Fundraise', desc: "Run, bake, cycle or shave — your effort funds a young person's first job.", to: '/get-involved/fundraise', order: 4 }
];

const DEFAULT_IMPACT = [
  { value: '1 in 5', text: 'young people with special needs finds paid employment without specialist support', order: 1 },
  { value: '3×', text: 'more likely our graduates are to gain meaningful work experience', order: 2 },
  { value: '100%', text: 'of families report improved confidence and independence', order: 3 }
];

const DEFAULT_SETTINGS = {
  hero_badge: 'A UK charity for ability, not labels',
  hero_headline_a: 'Every child deserves a',
  hero_headline_b: 'future.',
  hero_subheadline: 'SAM for Life empowers children with special needs to discover their abilities, build real-world skills, and step confidently into employment.',
  hero_image: 'https://images.unsplash.com/photo-1709127347878-bd27e64d1e3e?crop=entropy&cs=srgb&fm=jpg&q=85&w=1000',
  mission_eyebrow: 'Our mission',
  mission_title: 'A diagnosis is not a destination.',
  mission_body: 'At SAM for Life, we believe every young person — regardless of their learning difference, physical challenge, or neurodiversity — carries unique strengths the world needs. We exist to find those strengths, nurture them, and open doors that might otherwise stay closed.',
  impact_eyebrow: "The reality we're changing",
  impact_title: 'Numbers that demand action.',
  about_intro_eyebrow: 'About SAM for Life',
  about_intro_title: "We don't manage potential. We unleash it.",
  about_intro_body: 'SAM for Life was founded on a simple but powerful belief: that children with special needs are not problems to be managed — they are potential to be unleashed. Our mission is to bridge the gap between special education and meaningful employment, one young person at a time.',
  mission_card_title: 'Why we exist',
  mission_card_body: 'To bridge the gap between special education and meaningful employment — through specialist training, real workplaces, and a community that walks alongside every young person for life.',
  vision_card_title: "Where we're going",
  vision_card_body: 'A world where every young person with special needs has equal access to dignified, fulfilling work — chosen, not allocated.',
  about_story_body: 'SAM for Life began with one teenager — Sam — who left specialist school with the brightest smile in the room and absolutely no route into the job he dreamed of.\n\nOur founder, an SEND coordinator at the time, refused to accept that "no route" was the end of the story. She started knocking on local employers\' doors. A bakery said yes. Then a bookshop. Then a national retailer.\n\nSam is twenty-four now and trains other young people on his team. SAM for Life is the charity built on what he taught us: that work isn\'t just about income — it\'s about identity, belonging, and the radical dignity of being needed.',
  programme_intro_title: 'A journey from confidence to career.',
  programme_intro_body: "We don't deliver a course — we walk a road. Three connected stages help every young person move from foundation skills to a real, fulfilling job.",
  stories_intro_title: 'Stories that change everything.',
  stories_intro_body: 'Behind every statistic is a young person, a family, and an employer who said yes. These are some of theirs.',
  news_intro_title: "What's happening at SAM.",
  news_intro_body: 'Partnership launches, programme updates, research, and chances to get involved.',
  contact_intro_title: "We'd love to hear from you.",
  contact_intro_body: "Whether you're a parent, a young person, an employer or a fellow charity — drop us a line and a real person will reply.",
  get_involved_intro_title: "There's a place for you here.",
  get_involved_intro_body: 'Whether you have five minutes, five pounds or five team members — every contribution moves a young person closer to their first paycheque.',
  donate_intro_title: 'Your gift changes futures.',
  donate_intro_body: 'Every pound supports the journey of a young person with special needs into meaningful work. Donations are processed securely by Stripe.',
  volunteer_intro_title: 'Walk alongside a young person.',
  volunteer_intro_body: "From facilitating a workshop to mentoring one-to-one or coaching during a placement — we'll match you to a role that fits your skills, your time, and your heart.",
  partnership_intro_title: 'Inclusive hiring is smart business.',
  partnership_intro_body: 'Our employer partners report higher team morale, improved customer relations, and fresh perspectives. We handle matching, preparation and ongoing support — you simply open the door.',
  fundraise_intro_title: 'Run, bake, ride — and change a life.',
  fundraise_intro_body: "Every pound you raise funds another step toward employment for a young person with special needs. Pick an idea — or invent your own — and we'll cheer you on the whole way.",
  support_strip_title: '£25 funds one workshop. £75 a month of coaching. £300 changes one life.',
  footer_tagline: 'Empowering children with special needs to discover their abilities and step into employment with confidence.',
  footer_email: 'hello@samforlife.org',
  footer_phone: '+44 20 0000 0000',
  footer_location: 'United Kingdom',
  footer_copyright: '© 2026 SAM for Life. Registered charity (pending).',
  social_facebook: '#',
  social_instagram: '#',
  social_linkedin: '#',
  email_contact_admin_subject: '[Contact Form] {subject} - from {name}',
  email_contact_user_subject: 'We have received your message - SAM for Life',
  email_contact_user_body: `<p>Dear {name},</p>\n<p>Thank you for reaching out to us at <strong>SAM for Life</strong>.</p>\n<p>We wanted to let you know that we have successfully received your message. Our team is currently reviewing it and will get back to you as soon as possible (usually within 1-2 business days).</p>\n<p>In the meantime, feel free to browse our website to learn more about our programmes and the impact we are making together.</p>\n<br>\n<p>Warm regards,</p>\n<p><strong>The SAM for Life Team</strong></p>`,
  email_volunteer_admin_subject: '[Volunteer Apply] New Application from {name}',
  email_volunteer_user_subject: 'Thank you for your Volunteer Application - SAM for Life',
  email_volunteer_user_body: `<p>Dear {name},</p>\n<p>Thank you for your interest in volunteering with <strong>SAM for Life</strong>! We are incredibly grateful for your willingness to dedicate your time and skills to support our mission.</p>\n<p>This is to confirm that we have received your application. Our volunteer coordinator will review your profile, skills, and availability, and contact you shortly to schedule an onboarding chat or discuss potential opportunities.</p>\n<p>Thank you once again for your support and for joining hands with us.</p>\n<br>\n<p>Warm regards,</p>\n<p><strong>The SAM for Life Team</strong></p>`,
  email_partnership_admin_subject: '[Partnership Inquiry] {company} - {name}',
  email_partnership_user_subject: 'Partnership Inquiry Received - SAM for Life',
  email_partnership_user_body: `<p>Dear {name},</p>\n<p>Thank you for contacting us regarding a potential partnership between <strong>{company}</strong> and <strong>SAM for Life</strong>.</p>\n<p>We are excited about the possibility of collaborating to drive positive impact. We have received your partnership inquiry, and our development team will review the details and get in touch with you shortly to explore next steps.</p>\n<p>If you have any supporting documents or additional details to share in the meantime, feel free to reply directly to this email.</p>\n<br>\n<p>Warm regards,</p>\n<p><strong>The SAM for Life Team</strong></p>`,
  email_fundraise_admin_subject: '[Fundraising Idea] New Idea Submitted by {name}',
  email_fundraise_user_subject: 'Thank you for your Fundraising Idea - SAM for Life',
  email_fundraise_user_body: `<p>Dear {name},</p>\n<p>Thank you for submitting your fundraising idea to <strong>SAM for Life</strong>! We love creative and passionate ideas that help raise awareness and support for our cause.</p>\n<p>We have successfully received your idea, and our team will review it. We appreciate you taking the initiative to help fundraise for us.</p>\n<br>\n<p>Warm regards,</p>\n<p><strong>The SAM for Life Team</strong></p>`
};

async function seedCollection(model, data) {
  const count = await model.countDocuments({});
  if (count === 0 && data && data.length > 0) {
    const docs = data.map(d => ({ ...d, id: newID(), created_at: nowISO() }));
    await model.insertMany(docs);
    return docs.length;
  }
  return 0;
}

async function seedSettings() {
  const existing = await SiteSettings.findOne({ _singleton: true });
  if (!existing) {
    await SiteSettings.create({ _singleton: true, ...DEFAULT_SETTINGS, updated_at: nowISO() });
    return true;
  } else {
    // Check if new email fields are missing, and if so, update the document with defaults
    let updated = false;
    const emailFields = [
      'email_contact_admin_subject', 'email_contact_user_subject', 'email_contact_user_body',
      'email_volunteer_admin_subject', 'email_volunteer_user_subject', 'email_volunteer_user_body',
      'email_partnership_admin_subject', 'email_partnership_user_subject', 'email_partnership_user_body',
      'email_fundraise_admin_subject', 'email_fundraise_user_subject', 'email_fundraise_user_body'
    ];
    for (const field of emailFields) {
      if (existing[field] === undefined || existing[field] === null || existing[field] === '') {
        existing[field] = DEFAULT_SETTINGS[field];
        updated = true;
      }
    }
    if (updated) {
      existing.updated_at = nowISO();
      // Use markModified if it's a Mongoose model (which it is when MONGO_URL is set)
      if (existing.save) {
        await existing.save();
      } else {
        // Fallback for mock local JSON database
        await SiteSettings.updateOne({ _singleton: true }, { $set: existing });
      }
      console.log('Updated existing settings document with new email template defaults.');
      return true;
    }
  }
  return false;
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@samforlife.org';
  const password = process.env.ADMIN_PASSWORD || 'sam-admin-2026';
  const existing = await AdminUser.findOne({ email: email.toLowerCase() });
  if (!existing) {
    const password_hash = await hashPassword(password);
    await AdminUser.create({
      id: newID(),
      email: email.toLowerCase(),
      name: 'Admin',
      password_hash,
      created_at: nowISO()
    });
    return true;
  }
  return false;
}

async function runSeed() {
  const s1 = await seedCollection(Story, DEFAULT_STORIES);
  const s2 = await seedCollection(NewsItem, DEFAULT_NEWS);
  const s3 = await seedCollection(TeamMember, DEFAULT_TEAM);
  const s4 = await seedCollection(Value, DEFAULT_VALUES);
  const s5 = await seedCollection(ProgrammeStep, DEFAULT_PROGRAMME);
  const s6 = await seedCollection(FundraiseIdea, DEFAULT_FUNDRAISE);
  const s7 = await seedCollection(InvolvementCard, DEFAULT_INVOLVEMENT);
  const s8 = await seedCollection(ImpactStat, DEFAULT_IMPACT);
  const s9 = await seedSettings();
  const s10 = await seedAdmin();
  
  return {
    stories: s1, news: s2, team: s3, values: s4,
    programme: s5, fundraise: s6, involvement: s7,
    impact: s8, settings_seeded: s9, admin_seeded: s10
  };
}

module.exports = { runSeed };
