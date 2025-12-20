const jwt = require('jsonwebtoken');

function extractToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  const parts = h.split(' ');
  return parts.length === 2 && /^Bearer$/i.test(parts[0]) ? parts[1] : null;
}

function isAuthenticated(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role }
    next();
  } catch (e) {
    return res.status(403).json({ message: 'Invalid token' });
  }
}

function isDesigner(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  if (req.user.role !== 'designer') {
    return res.status(403).json({ message: 'Designer role required' });
  }
  next();
}

module.exports = { isAuthenticated, isDesigner };
