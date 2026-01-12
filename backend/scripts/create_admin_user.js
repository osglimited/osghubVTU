const { auth, db } = require('../src/config/firebase');

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const idx = args.indexOf(`--${name}`);
    if (idx !== -1 && args[idx + 1]) return args[idx + 1];
    return null;
  };

  const email = getArg('email') || process.env.ADMIN_EMAIL;
  const password = getArg('password') || process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Missing email or password');
    process.exit(1);
  }

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    await auth.updateUser(userRecord.uid, { password, emailVerified: true });
  } catch {
    userRecord = await auth.createUser({ email, password, emailVerified: true });
  }

  const claims = userRecord.customClaims || {};
  await auth.setCustomUserClaims(userRecord.uid, { ...claims, admin: true });

  const userRef = db.collection('users').doc(userRecord.uid);
  await userRef.set(
    {
      email,
      role: 'admin',
      isVerified: true,
      updatedAt: new Date(),
      createdAt: new Date(),
    },
    { merge: true }
  );

  console.log(JSON.stringify({ success: true, uid: userRecord.uid, email }));
}

main().catch((e) => {
  console.error(JSON.stringify({ success: false, error: e.message }));
  process.exit(1);
});
