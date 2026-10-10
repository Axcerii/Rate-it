import { Router } from 'express';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_MS,
  verifyAdminPassword,
  createAdminSession,
  revokeAdminSession,
  getAdminSessionToken,
  isValidAdminSession,
} from '../utils/security.js';

const router = Router();

// The session token only lives in an HttpOnly cookie: page scripts can never read it, so an XSS
// cannot steal it. SameSite=Strict keeps other sites from using it (CSRF).
function adminCookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: req.secure, // HTTPS behind the reverse proxy ("trust proxy" + X-Forwarded-Proto)
    path: '/',
  };
}

/**
 * POST /api/admin/login
 * Checks the admin password (rate limited per IP) and opens an admin session.
 */
router.post('/login', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    verifyAdminPassword(req.body?.password, req.ip);
  } catch (error) {
    return res.status(401).json({ success: false, error: error.message });
  }

  // Replace any previous session of this browser
  revokeAdminSession(getAdminSessionToken(req.headers.cookie));

  res.cookie(ADMIN_COOKIE_NAME, createAdminSession(), { ...adminCookieOptions(req), maxAge: ADMIN_SESSION_TTL_MS });
  return res.status(200).json({ success: true });
});

/**
 * POST /api/admin/logout
 */
router.post('/logout', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  revokeAdminSession(getAdminSessionToken(req.headers.cookie));
  res.clearCookie(ADMIN_COOKIE_NAME, adminCookieOptions(req));
  return res.status(200).json({ success: true });
});

/**
 * GET /api/admin/session
 * Lets the admin page know whether this browser holds a valid session (the cookie is not readable by scripts).
 */
router.get('/session', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    success: true,
    authenticated: isValidAdminSession(getAdminSessionToken(req.headers.cookie)),
  });
});

export default router;
