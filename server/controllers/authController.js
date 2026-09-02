import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

const LOGIN_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attemptsByIp = new Map();

// A very small in-memory rate limiter for the login endpoint specifically —
// this is the one route an attacker would actually try to brute-force.
function getRateLimit(ip) {
  const now = Date.now();
  const entry = attemptsByIp.get(ip);
  if (!entry || now - entry.windowStart > LOGIN_ATTEMPT_WINDOW_MS) {
    return null;
  }
  return entry;
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const entry = getRateLimit(ip);
  if (!entry) {
    attemptsByIp.set(ip, { windowStart: now, count: 1 });
    return;
  }
  entry.count += 1;
}

export async function login(req, res, next) {
  try {
    const ip = req.ip;
    const rateLimit = getRateLimit(ip);
    if (rateLimit?.count >= MAX_ATTEMPTS) {
      const retryAfter = Math.max(1, Math.ceil((LOGIN_ATTEMPT_WINDOW_MS - (Date.now() - rateLimit.windowStart)) / 1000));
      res.set('Retry-After', retryAfter);
      return res.status(429).json({ success: false, message: `Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.` });
    }

    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const admin = await Admin.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
    // Deliberately identical response whether the email doesn't exist or the
    // password is wrong — don't leak which one it was.
    const valid = admin && (await admin.verifyPassword(password));
    if (!valid) {
      recordFailedAttempt(ip);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    attemptsByIp.delete(ip);
    const token = jwt.sign({ sub: admin._id.toString(), email: admin.email, role: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: '12h',
    });

    return res.json({ success: true, data: { token, admin: { name: admin.name, email: admin.email } } });
  } catch (error) {
    return next(error);
  }
}

export async function me(req, res) {
  res.json({ success: true, data: req.admin });
}
