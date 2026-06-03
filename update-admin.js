/**
 * update-admin.js
 * Run this script to update the admin email & password in MongoDB.
 * Usage: node update-admin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { db } = require('./db');
const { hashPassword } = require('./auth');
const { AdminUser, newID, nowISO } = require('./db');

// ============================================================
// ✏️  SET YOUR NEW ADMIN CREDENTIALS HERE
// ============================================================
const NEW_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@samforlife.org';
const NEW_PASSWORD = process.env.ADMIN_PASSWORD || 'sam-admin-2026';
const NEW_NAME     = process.env.ADMIN_NAME     || 'Admin';
// ============================================================

async function updateAdmin() {
  console.log('\n🔐 SAM for Life — Admin Credential Update\n');

  await new Promise((res) => db.once('open', res));
  console.log('✅ Connected to MongoDB\n');

  const password_hash = await hashPassword(NEW_PASSWORD);

  // Try to find any existing admin
  const existing = await AdminUser.findOne({});

  if (existing) {
    // Update the existing admin
    await AdminUser.updateOne(
      { _id: existing._id },
      {
        $set: {
          email:         NEW_EMAIL.toLowerCase(),
          name:          NEW_NAME,
          password_hash: password_hash,
          updated_at:    nowISO()
        }
      }
    );
    console.log(`✅ Admin updated successfully!`);
  } else {
    // No admin exists — create one
    await AdminUser.create({
      id:            newID(),
      email:         NEW_EMAIL.toLowerCase(),
      name:          NEW_NAME,
      password_hash: password_hash,
      created_at:    nowISO()
    });
    console.log(`✅ Admin created successfully!`);
  }

  console.log(`\n📧 Email    : ${NEW_EMAIL}`);
  console.log(`🔑 Password : ${NEW_PASSWORD}`);
  console.log(`👤 Name     : ${NEW_NAME}`);
  console.log('\n🎉 Done! You can now log in with these credentials.\n');

  process.exit(0);
}

updateAdmin().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
