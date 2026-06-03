const mongoose = require('mongoose');
const crypto = require('crypto');
const pathModule = require('path');
const fs = require('fs');

require('dotenv').config({ path: pathModule.join(__dirname, '.env') });

const MONGO_URL = process.env.MONGO_URL;

const nowISO = () => new Date().toISOString();
const newID = () => crypto.randomUUID();

let dbConnection = { once: (event, cb) => { if (event === 'open') { setTimeout(cb, 100); } }, close: () => {} };
let Contact, Volunteer, Partnership, Newsletter, FundraiseSubmission,
    PaymentTransaction, AdminUser, Story, NewsItem, TeamMember, Value,
    ProgrammeStep, FundraiseIdea, InvolvementCard, ImpactStat, SiteSettings;

if (MONGO_URL) {
  console.log('Connecting to MongoDB at:', MONGO_URL);
  mongoose.connect(MONGO_URL)
    .then(() => console.log('Successfully connected to MongoDB.'))
    .catch((err) => console.error('MongoDB connection error:', err));
  
  dbConnection = mongoose.connection;

  // Mongoose configurations
  const baseSchemaConfig = (fields) => {
    return new mongoose.Schema({
      id: { type: String, default: newID, unique: true },
      created_at: { type: String, default: nowISO },
      updated_at: { type: String },
      ...fields
    }, { 
      versionKey: false,
      toJSON: {
        transform: (doc, ret) => {
          delete ret._id;
          return ret;
        }
      }
    });
  };

  Contact = mongoose.model('ContactSubmission', baseSchemaConfig({
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, default: 'new' }
  }));

  Volunteer = mongoose.model('VolunteerApplication', baseSchemaConfig({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    skills: { type: String, required: true },
    availability: { type: String, required: true },
    why: { type: String },
    status: { type: String, default: 'new' }
  }));

  Partnership = mongoose.model('PartnershipInquiry', baseSchemaConfig({
    company: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    interest: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, default: 'new' }
  }));

  Newsletter = mongoose.model('NewsletterSubscriber', baseSchemaConfig({
    email: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true }
  }));

  FundraiseSubmission = mongoose.model('FundraiseSubmission', baseSchemaConfig({
    name: { type: String },
    email: { type: String },
    idea: { type: String, required: true },
    status: { type: String, default: 'new' }
  }));

  PaymentTransaction = mongoose.model('PaymentTransaction', baseSchemaConfig({
    session_id: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'gbp' },
    frequency: { type: String, required: true },
    donor_name: { type: String, default: '' },
    donor_email: { type: String, default: '' },
    metadata: { type: Map, of: String },
    payment_status: { type: String, default: 'initiated' },
    status: { type: String, default: 'open' }
  }));

  AdminUser = mongoose.model('AdminUser', baseSchemaConfig({
    email: { type: String, required: true, unique: true },
    name: { type: String, default: 'Admin' },
    password_hash: { type: String, required: true }
  }));

  Story = mongoose.model('Story', baseSchemaConfig({
    key: { type: String, required: true },
    name: { type: String, required: true },
    age: { type: Number, required: true },
    role: { type: String, required: true },
    quote: { type: String, required: true },
    image: { type: String, required: true },
    teller: { type: String, required: true },
    body: { type: String, required: true },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true }
  }));

  NewsItem = mongoose.model('NewsItem', baseSchemaConfig({
    date: { type: String, required: true },
    tag: { type: String, required: true },
    title: { type: String, required: true },
    desc: { type: String, required: true },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true }
  }));

  TeamMember = mongoose.model('TeamMember', baseSchemaConfig({
    initials: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    bio: { type: String, required: true },
    order: { type: Number, default: 0 }
  }));

  Value = mongoose.model('Value', baseSchemaConfig({
    title: { type: String, required: true },
    desc: { type: String, required: true },
    order: { type: Number, default: 0 }
  }));

  ProgrammeStep = mongoose.model('ProgrammeStep', baseSchemaConfig({
    key: { type: String, required: true },
    eyebrow: { type: String, required: true },
    title: { type: String, required: true },
    desc: { type: String, required: true },
    icon: { type: String, required: true },
    image: { type: String, required: true },
    bullets: [{ type: String }],
    order: { type: Number, default: 0 }
  }));

  FundraiseIdea = mongoose.model('FundraiseIdea', baseSchemaConfig({
    icon: { type: String, required: true },
    title: { type: String, required: true },
    desc: { type: String, required: true },
    order: { type: Number, default: 0 }
  }));

  InvolvementCard = mongoose.model('InvolvementCard', baseSchemaConfig({
    key: { type: String, required: true },
    icon: { type: String, required: true },
    title: { type: String, required: true },
    desc: { type: String, required: true },
    to: { type: String, required: true },
    order: { type: Number, default: 0 }
  }));

  ImpactStat = mongoose.model('ImpactStat', baseSchemaConfig({
    value: { type: String, required: true },
    text: { type: String, required: true },
    order: { type: Number, default: 0 }
  }));

  SiteSettings = mongoose.model('SiteSettings', new mongoose.Schema({
    _singleton: { type: Boolean, default: true, unique: true },
    hero_badge: { type: String },
    hero_headline_a: { type: String },
    hero_headline_b: { type: String },
    hero_subheadline: { type: String },
    hero_image: { type: String },
    mission_eyebrow: { type: String },
    mission_title: { type: String },
    mission_body: { type: String },
    impact_eyebrow: { type: String },
    impact_title: { type: String },
    about_intro_eyebrow: { type: String },
    about_intro_title: { type: String },
    about_intro_body: { type: String },
    mission_card_title: { type: String },
    mission_card_body: { type: String },
    vision_card_title: { type: String },
    vision_card_body: { type: String },
    about_story_body: { type: String },
    programme_intro_title: { type: String },
    programme_intro_body: { type: String },
    stories_intro_title: { type: String },
    stories_intro_body: { type: String },
    news_intro_title: { type: String },
    news_intro_body: { type: String },
    contact_intro_title: { type: String },
    contact_intro_body: { type: String },
    get_involved_intro_title: { type: String },
    get_involved_intro_body: { type: String },
    donate_intro_title: { type: String },
    donate_intro_body: { type: String },
    volunteer_intro_title: { type: String },
    volunteer_intro_body: { type: String },
    partnership_intro_title: { type: String },
    partnership_intro_body: { type: String },
    fundraise_intro_title: { type: String },
    fundraise_intro_body: { type: String },
    support_strip_title: { type: String },
    footer_tagline: { type: String },
    footer_email: { type: String },
    footer_phone: { type: String },
    footer_location: { type: String },
    footer_copyright: { type: String },
    social_facebook: { type: String },
    social_instagram: { type: String },
    social_linkedin: { type: String },
    receipt_charity_number: { type: String },
    receipt_address: { type: String },
    receipt_thank_you: { type: String },
    invoice_terms: { type: String },
    email_contact_admin_subject: { type: String },
    email_contact_user_subject: { type: String },
    email_contact_user_body: { type: String },
    email_volunteer_admin_subject: { type: String },
    email_volunteer_user_subject: { type: String },
    email_volunteer_user_body: { type: String },
    email_partnership_admin_subject: { type: String },
    email_partnership_user_subject: { type: String },
    email_partnership_user_body: { type: String },
    email_fundraise_admin_subject: { type: String },
    email_fundraise_user_subject: { type: String },
    email_fundraise_user_body: { type: String },
    updated_at: { type: String, default: nowISO }
  }, {
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret._singleton;
        return ret;
      }
    }
  }));

} else {
  console.log('MONGO_URL not set in environment. Falling back to local JSON database storage.');

  const dbFile = pathModule.join(__dirname, 'db.json');

  const loadData = (colName) => {
    try {
      if (!fs.existsSync(dbFile)) {
        fs.writeFileSync(dbFile, JSON.stringify({}));
      }
      const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      return data[colName] || [];
    } catch (err) {
      return [];
    }
  };

  const saveData = (colName, items) => {
    try {
      let data = {};
      if (fs.existsSync(dbFile)) {
        data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      }
      data[colName] = items;
      fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Error saving data to db.json:', err);
    }
  };

  const matches = (doc, filter) => {
    if (!filter) return true;
    for (const k in filter) {
      const v = filter[k];
      if (k === '$or') {
        let matchAny = false;
        for (const subFilter of v) {
          if (matches(doc, subFilter)) {
            matchAny = true;
            break;
          }
        }
        if (!matchAny) return false;
      } else if (v && typeof v === 'object' && '$exists' in v) {
        const exists = v['$exists'];
        const hasKey = k in doc;
        if (hasKey !== exists) return false;
      } else {
        if (doc[k] !== v) return false;
      }
    }
    return true;
  };

  class MockQuery {
    constructor(items) {
      this.items = items;
    }

    sort(sortObj) {
      const key = Object.keys(sortObj)[0];
      const direction = sortObj[key]; // 1 or -1
      
      this.items.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        
        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';
        
        if (typeof valA === 'number' && typeof valB === 'number') {
          return direction * (valA - valB);
        }
        return direction * String(valA).localeCompare(String(valB));
      });
      return this;
    }

    then(onfulfilled) {
      return Promise.resolve(this.items).then(onfulfilled);
    }
  }

  class MockModel {
    constructor(colName) {
      this.colName = colName;
    }

    find(filter = {}) {
      const items = loadData(this.colName);
      const matched = items.filter(item => matches(item, filter));
      return new MockQuery(matched);
    }

    async findOne(filter = {}) {
      const items = loadData(this.colName);
      const doc = items.find(item => matches(item, filter));
      return doc || null;
    }

    async create(doc) {
      const items = loadData(this.colName);
      const docObj = { ...doc };
      if (!docObj.id) docObj.id = newID();
      if (!docObj.created_at) docObj.created_at = nowISO();
      items.push(docObj);
      saveData(this.colName, items);
      return docObj;
    }

    async insertMany(docs) {
      const items = loadData(this.colName);
      const added = [];
      for (const doc of docs) {
        const docObj = { ...doc };
        if (!docObj.id) docObj.id = newID();
        if (!docObj.created_at) docObj.created_at = nowISO();
        items.push(docObj);
        added.push(docObj);
      }
      saveData(this.colName, items);
      return added;
    }

    async updateOne(filter, update, options = {}) {
      const items = loadData(this.colName);
      let matchedCount = 0;
      let modifiedCount = 0;
      const setDict = update.$set || {};

      for (const doc of items) {
        if (matches(doc, filter)) {
          matchedCount++;
          for (const k in setDict) {
            doc[k] = setDict[k];
          }
          modifiedCount++;
          break;
        }
      }

      if (matchedCount === 0 && options.upsert) {
        const newDoc = {};
        if (filter && typeof filter === 'object') {
          for (const k in filter) {
            if (!k.startsWith('$')) newDoc[k] = filter[k];
          }
        }
        for (const k in setDict) {
          newDoc[k] = setDict[k];
        }
        if (!newDoc.id) newDoc.id = newID();
        if (!newDoc.created_at) newDoc.created_at = nowISO();
        items.push(newDoc);
        matchedCount = 1;
        modifiedCount = 1;
      }

      saveData(this.colName, items);
      return { matchedCount, modifiedCount };
    }

    async deleteOne(filter) {
      const items = loadData(this.colName);
      const index = items.findIndex(item => matches(item, filter));
      let deletedCount = 0;
      if (index !== -1) {
        items.splice(index, 1);
        deletedCount = 1;
        saveData(this.colName, items);
      }
      return { deletedCount };
    }

    async countDocuments(filter = {}) {
      const items = loadData(this.colName);
      const matched = items.filter(item => matches(item, filter));
      return matched.length;
    }
  }

  Contact = new MockModel('ContactSubmission');
  Volunteer = new MockModel('VolunteerApplication');
  Partnership = new MockModel('PartnershipInquiry');
  Newsletter = new MockModel('NewsletterSubscriber');
  FundraiseSubmission = new MockModel('FundraiseSubmission');
  PaymentTransaction = new MockModel('PaymentTransaction');
  AdminUser = new MockModel('AdminUser');
  Story = new MockModel('Story');
  NewsItem = new MockModel('NewsItem');
  TeamMember = new MockModel('TeamMember');
  Value = new MockModel('Value');
  ProgrammeStep = new MockModel('ProgrammeStep');
  FundraiseIdea = new MockModel('FundraiseIdea');
  InvolvementCard = new MockModel('InvolvementCard');
  ImpactStat = new MockModel('ImpactStat');
  
  // Singleton settings model
  class MockSiteSettingsModel extends MockModel {
    constructor() {
      super('SiteSettings');
    }
    
    async findOne(filter = {}) {
      const items = loadData(this.colName);
      let doc = items.find(item => item._singleton === true);
      return doc || null;
    }

    async updateOne(filter, update, options = {}) {
      const items = loadData(this.colName);
      let doc = items.find(item => item._singleton === true);
      const setDict = update.$set || {};
      
      if (doc) {
        for (const k in setDict) {
          doc[k] = setDict[k];
        }
      } else {
        doc = { _singleton: true, ...setDict };
        if (!doc.id) doc.id = newID();
        if (!doc.created_at) doc.created_at = nowISO();
        items.push(doc);
      }
      saveData(this.colName, items);
      return { matchedCount: 1, modifiedCount: 1 };
    }
  }

  SiteSettings = new MockSiteSettingsModel();
}

const connectDB = async () => {
  if (!MONGO_URL) return null;
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve) => {
      mongoose.connection.once('open', resolve);
    });
    return mongoose.connection;
  }
  await mongoose.connect(MONGO_URL);
  return mongoose.connection;
};

module.exports = {
  db: dbConnection,
  connectDB,
  Contact,
  Volunteer,
  Partnership,
  Newsletter,
  FundraiseSubmission,
  PaymentTransaction,
  AdminUser,
  Story,
  NewsItem,
  TeamMember,
  Value,
  ProgrammeStep,
  FundraiseIdea,
  InvolvementCard,
  ImpactStat,
  SiteSettings,
  nowISO,
  newID
};
