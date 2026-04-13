const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { normalizeUserProfile } = require('../utils/user-profile-normalization');

const userPreferencesSchema = new mongoose.Schema(
  {
    vegetarian: { type: Boolean, default: false },
    glutenFree: { type: Boolean, default: false },
    lactoseFree: { type: Boolean, default: false },
  },
  { _id: false }
);

const authProviderSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ['local', 'google', 'apple'], required: true },
    providerId: { type: String, default: '' },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, default: '' },
    providers: { type: [authProviderSchema], default: [{ provider: 'local', providerId: '' }] },
    preferences: { type: userPreferencesSchema, default: () => ({}) },
    restrictions: { type: [String], default: [] },
    biometricEnabled: { type: Boolean, default: false },
    biometricDeviceIdHash: { type: String, default: '' },
    biometricChallengeHash: { type: String, default: '' },
    biometricChallengeExpiresAt: { type: Date, default: null },
    analyticsConsent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre('validate', function normalizeProfile(next) {
  const normalized = normalizeUserProfile({
    preferences: this.preferences,
    restrictions: this.restrictions,
  });

  this.preferences = normalized.preferences;
  this.restrictions = normalized.restrictions;

  next();
});

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

userSchema.methods.validatePassword = async function validatePassword(password) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
