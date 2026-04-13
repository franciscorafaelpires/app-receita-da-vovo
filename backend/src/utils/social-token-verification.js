const { OAuth2Client } = require('google-auth-library');
const appleSigninAuth = require('apple-signin-auth');

const googleClient = new OAuth2Client();

async function verifyGoogleIdToken(idToken) {
  const audience = process.env.GOOGLE_CLIENT_ID || undefined;
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload?.email) {
    throw new Error('Token Google invalido');
  }

  return {
    providerId: payload.sub,
    email: payload.email,
    name: payload.name || 'Usuario Google',
  };
}

async function verifyAppleIdToken(idToken, nonce, fallbackEmail, fallbackName) {
  const audience = process.env.APPLE_SERVICE_ID || process.env.APPLE_BUNDLE_ID || undefined;

  const claims = await appleSigninAuth.verifyIdToken(idToken, {
    audience,
    nonce,
    ignoreExpiration: false,
  });

  const email = claims.email || fallbackEmail;
  if (!claims.sub || !email) {
    throw new Error('Token Apple invalido');
  }

  return {
    providerId: claims.sub,
    email,
    name: fallbackName || 'Usuario Apple',
  };
}

async function verifySocialIdentity({ provider, idToken, nonce, email, name }) {
  if (!idToken) {
    throw new Error('idToken e obrigatorio');
  }

  if (provider === 'google') {
    return verifyGoogleIdToken(idToken);
  }

  if (provider === 'apple') {
    return verifyAppleIdToken(idToken, nonce, email, name);
  }

  throw new Error('provider invalido');
}

module.exports = {
  verifySocialIdentity,
};
