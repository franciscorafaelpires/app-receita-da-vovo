const crypto = require('crypto');
const express = require('express');

const AnalyticsEvent = require('../models/AnalyticsEvent');
const User = require('../models/User');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

function getUserHash(userId) {
  const salt = process.env.ANALYTICS_SALT || 'analytics-dev-salt';
  return crypto.createHash('sha256').update(`${userId}:${salt}`).digest('hex');
}

router.use(requireAuth);

router.post('/consent', async (req, res) => {
  const { enabled } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'Usuario nao encontrado' });
  }

  user.analyticsConsent = !!enabled;
  await user.save();

  return res.json({ analyticsConsent: user.analyticsConsent });
});

router.post('/event', async (req, res) => {
  const { eventName, metadata = {} } = req.body;

  if (!eventName) {
    return res.status(400).json({ message: 'eventName e obrigatorio' });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'Usuario nao encontrado' });
  }

  if (!user.analyticsConsent) {
    return res.status(403).json({ message: 'Consentimento de analytics nao concedido' });
  }

  const event = await AnalyticsEvent.create({
    userHash: getUserHash(req.user.id),
    eventName,
    metadata,
  });

  return res.status(201).json({ _id: event._id, eventName: event.eventName, createdAt: event.createdAt });
});

module.exports = router;
