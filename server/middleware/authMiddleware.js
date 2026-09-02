import jwt from 'jsonwebtoken';

// Protects any route that only the merchant/admin should reach. The
// customer-facing kiosk never sends this header, so /api/orders (list) and
// the status-update endpoint are invisible/unusable to it.
export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    req.admin = { id: payload.sub, email: payload.email };
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Session expired, please log in again.' });
  }
}

export function verifyAdminToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (payload.role !== 'admin') throw new Error('Not an admin token');
  return payload;
}
