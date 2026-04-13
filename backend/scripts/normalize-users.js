const dotenv = require('dotenv');
const mongoose = require('mongoose');

const User = require('../src/models/User');
const { normalizeUserProfile } = require('../src/utils/user-profile-normalization');

dotenv.config();

async function normalizeAllUsers() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI nao definido. Configure backend/.env');
  }

  await mongoose.connect(mongoUri);

  const users = await User.find({});
  let updated = 0;

  for (const user of users) {
    const normalized = normalizeUserProfile({
      preferences: user.preferences,
      restrictions: user.restrictions,
    });

    const before = JSON.stringify({
      preferences: user.preferences,
      restrictions: user.restrictions,
    });

    const after = JSON.stringify(normalized);

    if (before !== after) {
      user.preferences = normalized.preferences;
      user.restrictions = normalized.restrictions;
      await user.save();
      updated += 1;
    }
  }

  await mongoose.disconnect();

  console.log(`Usuarios verificados: ${users.length}`);
  console.log(`Usuarios normalizados: ${updated}`);
}

normalizeAllUsers().catch((error) => {
  console.error('Falha ao normalizar usuarios:', error.message);
  process.exit(1);
});
