const path = require('path');
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
const { auth, db } = require('../src/config/firebase');

async function promoteToAdmin(email, password) {
  if (!email || !password) {
    console.error('Usage: node scripts/create_admin_user.js <email> <password>');
    process.exit(1);
  }
  try {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch {
      userRecord = await auth.createUser({ email, password, emailVerified: true });
    }
    if (password) {
      await auth.updateUser(userRecord.uid, { password });
    }
    const claims = userRecord.customClaims || {};
    await auth.setCustomUserClaims(userRecord.uid, { ...claims, admin: true });
    await db.collection('users').doc(userRecord.uid).set(
      { role: 'admin', email, updatedAt: new Date() },
      { merge: true }
    );
    console.log(JSON.stringify({ success: true, uid: userRecord.uid, email }, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error && error.message ? error.message : String(error));
    process.exit(1);
  }
}

const [email, password] = process.argv.slice(2);
promoteToAdmin(email, password);

