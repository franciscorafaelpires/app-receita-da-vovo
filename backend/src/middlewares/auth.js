const jwt = require('jsonwebtoken');

function parseAuthHeader(value = '') {
  const [scheme, token] = value.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

function requireAuth(req, res, next) {
  const token = parseAuthHeader(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ message: 'Token ausente' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };
    return next();
  } catch {
    return res.status(401).json({ message: 'Token invalido' });
  }
}

module.exports = { requireAuth };
