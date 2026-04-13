const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/User');
const { requireAuth } = require('../middlewares/auth');
const { verifySocialIdentity } = require('../utils/social-token-verification');

const router = express.Router();

function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canUseSimulatedSocialLogin() {
  return process.env.ALLOW_SIMULATED_SOCIAL_LOGIN === 'true' || process.env.NODE_ENV !== 'production';
}

function signUser(user) {
  const token = jwt.sign(
    {
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET || 'dev-secret',
    {
      subject: user._id.toString(),
      expiresIn: '7d',
    }
  );

  return {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      preferences: user.preferences,
      restrictions: user.restrictions,
      biometricEnabled: user.biometricEnabled,
      analyticsConsent: user.analyticsConsent,
    },
  };
}

router.post('/register', async (req, res) => {
  const {
    name,
    email,
    password,
    preferences = {},
    restrictions = [],
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email e password sao obrigatorios' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: 'Email ja cadastrado' });
  }

  const user = new User({
    name,
    email,
    preferences,
    restrictions,
    providers: [{ provider: 'local', providerId: '' }],
  });
  await user.setPassword(password);
  await user.save();

  return res.status(201).json(signUser(user));
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'email e password sao obrigatorios' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.validatePassword(password))) {
    return res.status(401).json({ message: 'Credenciais invalidas' });
  }

  return res.json(signUser(user));
});

router.post('/social-login', async (req, res) => {
  const { provider, email, name = 'Usuario Social', providerId = '', idToken = '', nonce = '' } = req.body;

  if (!provider || !['google', 'apple'].includes(provider)) {
    return res.status(400).json({ message: 'provider deve ser google ou apple' });
  }

  let socialIdentity = null;

  if (idToken) {
    try {
      socialIdentity = await verifySocialIdentity({
        provider,
        idToken,
        nonce,
        email,
        name,
      });
    } catch (error) {
      return res.status(401).json({ message: error.message || 'Falha ao validar token social' });
    }
  } else if (!canUseSimulatedSocialLogin()) {
    return res.status(400).json({ message: 'idToken e obrigatorio para login social' });
  }

  const resolvedEmail = (socialIdentity?.email || email || '').toLowerCase();
  const resolvedName = socialIdentity?.name || name;
  const resolvedProviderId = socialIdentity?.providerId || providerId;

  if (!resolvedEmail) {
    return res.status(400).json({ message: 'email e obrigatorio para login social' });
  }

  let user = await User.findOne({ email: resolvedEmail });

  if (!user) {
    user = await User.create({
      name: resolvedName,
      email: resolvedEmail,
      providers: [{ provider, providerId: resolvedProviderId }],
      restrictions: [],
      preferences: {},
    });
  }

  const alreadyLinked = user.providers.some((p) => p.provider === provider);
  if (!alreadyLinked) {
    user.providers.push({ provider, providerId: resolvedProviderId });
    await user.save();
  }

  const response = signUser(user);

  if (!idToken) {
    response.socialMode = 'simulado-dev';
  }

  return res.json(response);
});

router.post('/biometric/enable', requireAuth, async (req, res) => {
  const { enabled = true, deviceId = '' } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'Usuario nao encontrado' });
  }

  if (enabled) {
    if (!deviceId || String(deviceId).length < 8) {
      return res.status(400).json({ message: 'deviceId valido e obrigatorio para habilitar biometria' });
    }

    user.biometricEnabled = true;
    user.biometricDeviceIdHash = hashValue(String(deviceId));
  } else {
    user.biometricEnabled = false;
    user.biometricDeviceIdHash = '';
    user.biometricChallengeHash = '';
    user.biometricChallengeExpiresAt = null;
  }

  await user.save();

  return res.json({ biometricEnabled: user.biometricEnabled });
});

router.post('/biometric/challenge', async (req, res) => {
  const { email, deviceId = '' } = req.body;

  if (!email || !deviceId) {
    return res.status(400).json({ message: 'email e deviceId sao obrigatorios' });
  }

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user || !user.biometricEnabled) {
    return res.status(401).json({ message: 'Biometria nao habilitada para este usuario' });
  }

  if (!user.biometricDeviceIdHash || user.biometricDeviceIdHash !== hashValue(String(deviceId))) {
    return res.status(401).json({ message: 'Dispositivo nao autorizado para biometria' });
  }

  const challenge = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 90 * 1000);

  user.biometricChallengeHash = hashValue(challenge);
  user.biometricChallengeExpiresAt = expiresAt;
  await user.save();

  return res.json({ challenge, expiresAt: expiresAt.toISOString() });
});

router.post('/biometric/login', async (req, res) => {
  const { email, deviceId = '', challenge = '' } = req.body;

  if (!email || !deviceId || !challenge) {
    return res.status(400).json({ message: 'email, deviceId e challenge sao obrigatorios' });
  }

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user || !user.biometricEnabled) {
    return res.status(401).json({ message: 'Biometria nao habilitada para este usuario' });
  }

  if (!user.biometricDeviceIdHash || user.biometricDeviceIdHash !== hashValue(String(deviceId))) {
    return res.status(401).json({ message: 'Dispositivo nao autorizado para biometria' });
  }

  if (!user.biometricChallengeHash || !user.biometricChallengeExpiresAt) {
    return res.status(401).json({ message: 'Challenge biometrico ausente ou expirado' });
  }

  const isExpired = user.biometricChallengeExpiresAt.getTime() < Date.now();
  const isValidChallenge = user.biometricChallengeHash === hashValue(String(challenge));
  user.biometricChallengeHash = '';
  user.biometricChallengeExpiresAt = null;
  await user.save();

  if (isExpired || !isValidChallenge) {
    return res.status(401).json({ message: 'Challenge biometrico invalido ou expirado' });
  }

  return res.json(signUser(user));
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'Usuario nao encontrado' });
  }

  return res.json(signUser(user).user);
});

module.exports = router;
