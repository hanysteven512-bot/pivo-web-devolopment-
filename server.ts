import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import {
  ADMIN_COOKIE_NAME,
  AuthRequest,
  hashSessionToken,
  requireAuth,
} from './src/middleware/auth.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { getOrCreateUser } from './src/db/users.ts';
import {
  computePasswordHash,
  createAdminSessionRecord,
  createMediaItemAdmin,
  createNavigationLinkAdmin,
  createProjectAdmin,
  createVisitorOrder,
  deleteAdminSessionByHash,
  deleteMediaItemAdmin,
  deleteNavigationLinkAdmin,
  deleteOrderAdmin,
  deleteProjectAdmin,
  getActiveAdminSessions,
  getAdminCredentialRecord,
  getAllMediaAdmin,
  getAllNavigationLinksAdmin,
  getAllOrdersAdmin,
  getAllProjectsAdmin,
  getAllSettingsAdmin,
  getMediaById,
  getPublicSiteData,
  getRawPrivateNotificationSettings,
  getRecentSecurityLogs,
  logSecurityEvent,
  reorderNavigationLinksAdmin,
  reorderProjectsAdmin,
  replaceMediaItemAdmin,
  updateAdminPassword,
  updateNavigationLinkAdmin,
  updateOrderAdmin,
  updateProjectAdmin,
  upsertSettingsBatch,
} from './src/db/repository.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ============================================================================
// SECURITY HELPERS & RATE LIMITING
// ============================================================================

const loginRateLimit = new Map<string, { count: number; resetAt: number }>();
const orderRateLimit = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

function isSafeUrl(urlStr: string, allowInternalAnchors = true): boolean {
  if (!urlStr || urlStr.trim() === '') return true;
  const trimmed = urlStr.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:')
  ) {
    return false;
  }
  if (allowInternalAnchors && (trimmed.startsWith('#') || trimmed.startsWith('/'))) {
    return true;
  }
  if (lower.startsWith('mailto:') || lower.startsWith('tel:')) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  // International phone validation: 6 to 20 digits, allowing +, spaces, hyphens, parentheses
  const cleaned = phone.trim();
  if (!/^[+\d\s\-().]{6,25}$/.test(cleaned)) return false;
  const digits = cleaned.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 16;
}

// ============================================================================
// REAL-TIME SSE CLIENTS FOR ADMIN DASHBOARD NOTIFICATIONS
// ============================================================================

const sseClients = new Set<Response>();

function broadcastNewOrderToAdmins(order: any) {
  const payload = JSON.stringify({
    type: 'NEW_ORDER',
    order: {
      id: order.id,
      orderCode: order.orderCode,
      customerName: order.customerName,
      projectType: order.projectType,
      budgetRange: order.budgetRange,
      createdAt: order.createdAt,
    },
  });
  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

async function dispatchExternalNotifications(order: any): Promise<{
  emailSent: boolean;
  telegramSent: boolean;
}> {
  const result = { emailSent: false, telegramSent: false };
  try {
    const config = await getRawPrivateNotificationSettings();

    // 1. Real Email Notification via SMTP if enabled and configured
    if (
      config.notify_email_enabled === 'true' &&
      config.smtp_host &&
      config.smtp_user &&
      config.smtp_pass &&
      config.notify_recipient_email
    ) {
      try {
        const transporter = nodemailer.createTransport({
          host: config.smtp_host,
          port: Number(config.smtp_port) || 587,
          secure: Number(config.smtp_port) === 465,
          auth: {
            user: config.smtp_user,
            pass: config.smtp_pass,
          },
        });

        await transporter.sendMail({
          from: config.smtp_from || config.smtp_user,
          to: config.notify_recipient_email,
          subject: `[PIVO] New Project Request ${order.orderCode} from ${order.customerName}`,
          text: [
            `New PIVO Project Request Received`,
            `----------------------------------------`,
            `Order ID: ${order.orderCode}`,
            `Customer Name: ${order.customerName}`,
            `Phone: ${order.phone}`,
            `Email: ${order.email}`,
            `Project Type: ${order.projectType || 'Not specified'}`,
            `Budget Range: ${order.budgetRange || 'Not specified'}`,
            `Reference Website: ${order.referenceUrl || 'None'}`,
            ``,
            `Project Description:`,
            `${order.projectDescription}`,
            ``,
            `Additional Notes:`,
            `${order.additionalNotes || 'None'}`,
          ].join('\n'),
        });
        result.emailSent = true;
      } catch (emailErr) {
        console.error('Failed to send SMTP email notification:', emailErr);
      }
    }

    // 2. Real Telegram Notification via Telegram Bot API if enabled and configured
    if (
      config.notify_telegram_enabled === 'true' &&
      config.telegram_bot_token &&
      config.telegram_chat_id
    ) {
      try {
        const text = [
          `🔔 *New PIVO Project Order*`,
          `*Order ID:* \`${order.orderCode}\``,
          `*Client:* ${order.customerName}`,
          `*Phone:* ${order.phone}`,
          `*Email:* ${order.email}`,
          `*Type:* ${order.projectType || 'Not specified'}`,
          `*Budget:* ${order.budgetRange || 'Not specified'}`,
          `*Description:* ${order.projectDescription.slice(0, 500)}`,
        ].join('\n');

        const tgRes = await fetch(
          `https://api.telegram.org/bot${encodeURIComponent(config.telegram_bot_token)}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: config.telegram_chat_id,
              text,
              parse_mode: 'Markdown',
            }),
          }
        );
        if (tgRes.ok) {
          result.telegramSent = true;
        }
      } catch (tgErr) {
        console.error('Failed to send Telegram notification:', tgErr);
      }
    }
  } catch (err) {
    console.error('Notification dispatch error:', err);
  }
  return result;
}

// ============================================================================
// PUBLIC API ROUTES (Visitor Website "/")
// ============================================================================

app.get('/api/public/site', async (_req: Request, res: Response) => {
  try {
    const data = await getPublicSiteData();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load website content.' });
  }
});

app.get('/api/media/file/:id', async (req: Request, res: Response) => {
  try {
    const mediaId = Number(req.params.id);
    if (!Number.isInteger(mediaId) || mediaId <= 0) {
      return res.status(400).send('Invalid media ID');
    }
    const item = await getMediaById(mediaId);
    if (!item || !item.dataUrl) {
      return res.status(404).send('Media not found');
    }

    const dataUrl = item.dataUrl;
    if (dataUrl.startsWith('data:')) {
      const commaIdx = dataUrl.indexOf(',');
      if (commaIdx !== -1) {
        const header = dataUrl.slice(5, commaIdx);
        const body = dataUrl.slice(commaIdx + 1);
        const isBase64 = header.includes(';base64');
        const mimeType = header.split(';')[0] || item.mimeType || 'image/svg+xml';

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        if (isBase64) {
          const buf = Buffer.from(body, 'base64');
          return res.send(buf);
        } else {
          return res.send(decodeURIComponent(body));
        }
      }
    }

    res.setHeader('Content-Type', item.mimeType || 'image/svg+xml');
    return res.send(dataUrl);
  } catch (error) {
    console.error('Failed to serve media:', error);
    return res.status(500).send('Error loading media');
  }
});

app.post('/api/public/orders', async (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    const now = Date.now();
    const rate = orderRateLimit.get(ip);
    if (rate && rate.resetAt > now) {
      if (rate.count >= 8) {
        return res.status(429).json({
          error: 'Too many requests submitted recently. Please wait a few minutes and try again.',
        });
      }
      rate.count += 1;
    } else {
      orderRateLimit.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    }

    // Honeypot anti-spam check
    if (req.body.website_honeypot && String(req.body.website_honeypot).trim() !== '') {
      return res.status(400).json({ error: 'Spam submission rejected.' });
    }

    const customerName = String(req.body.customerName || '').trim();
    const phone = String(req.body.phone || '').trim();
    const email = String(req.body.email || '').trim();
    const projectType = String(req.body.projectType || '').trim();
    const budgetRange = String(req.body.budgetRange || '').trim();
    const projectDescription = String(req.body.projectDescription || '').trim();
    const referenceUrl = String(req.body.referenceUrl || '').trim();
    const additionalNotes = String(req.body.additionalNotes || '').trim();

    if (!customerName || customerName.length < 2) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({
        error: 'Please enter a valid international or local phone number.',
      });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!projectDescription || projectDescription.length < 10) {
      return res.status(400).json({
        error: 'Please provide a brief project description (at least 10 characters).',
      });
    }
    if (referenceUrl && !isSafeUrl(referenceUrl, false)) {
      return res.status(400).json({
        error: 'Reference website must be a valid http:// or https:// URL.',
      });
    }

    const createdOrder = await createVisitorOrder({
      customerName: customerName.slice(0, 150),
      phone: phone.slice(0, 40),
      email: email.slice(0, 150),
      projectType: projectType.slice(0, 100),
      budgetRange: budgetRange.slice(0, 100),
      projectDescription: projectDescription.slice(0, 5000),
      referenceUrl: referenceUrl.slice(0, 500),
      additionalNotes: additionalNotes.slice(0, 3000),
    });

    // Notify open admin dashboards in real time
    broadcastNewOrderToAdmins(createdOrder);

    // Trigger external notifications asynchronously
    dispatchExternalNotifications(createdOrder).catch((err) =>
      console.error('Background notification error:', err)
    );

    return res.status(201).json({
      success: true,
      orderCode: createdOrder.orderCode,
      createdAt: createdOrder.createdAt,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Unable to submit your request right now. Please try again.',
    });
  }
});

// ============================================================================
// ADMIN AUTHENTICATION & SECURITY ROUTES ("/admin")
// ============================================================================

app.post('/api/admin/auth/login', async (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    const now = Date.now();
    const attempt = loginRateLimit.get(ip);

    if (attempt && attempt.resetAt > now && attempt.count >= 6) {
      await logSecurityEvent(
        'RATE_LIMIT_LOCKOUT',
        'Blocked login attempt due to excessive failed tries.',
        ip
      );
      return res.status(429).json({
        error: 'Too many failed login attempts. Please wait 10 minutes or use Google Recovery.',
      });
    }

    const password = String(req.body.password || '');
    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    const cred = await getAdminCredentialRecord();
    if (!cred) {
      return res.status(500).json({ error: 'Administrator credentials not initialized.' });
    }

    const computedHash = computePasswordHash(password, cred.passwordSalt);
    const expectedBuf = Buffer.from(cred.passwordHash, 'hex');
    const actualBuf = Buffer.from(computedHash, 'hex');

    const isMatch =
      expectedBuf.length === actualBuf.length &&
      crypto.timingSafeEqual(expectedBuf, actualBuf);

    if (!isMatch) {
      const nextCount = attempt && attempt.resetAt > now ? attempt.count + 1 : 1;
      loginRateLimit.set(ip, { count: nextCount, resetAt: now + 10 * 60 * 1000 });
      await logSecurityEvent(
        'LOGIN_FAILED',
        `Failed password login attempt (${nextCount}/6).`,
        ip
      );
      return res.status(401).json({ error: 'Invalid administrator password.' });
    }

    // Reset rate limit on success
    loginRateLimit.delete(ip);

    // Create cryptographically random session token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await createAdminSessionRecord({
      tokenHash,
      authMethod: 'password',
      ipAddress: ip,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 250),
      expiresAt,
    });

    await logSecurityEvent('LOGIN_SUCCESS', 'Administrator signed in via password.', ip);

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie(ADMIN_COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'none' : 'lax',
      expires: expiresAt,
      path: '/',
    });

    return res.json({
      authenticated: true,
      mustChangePassword: cred.mustChangePassword,
      recoveryEmail: cred.recoveryEmail,
      authMethod: 'password',
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: error.message || 'Authentication failed.' });
  }
});

// Exchange verified Firebase Google Sign-In token for an HTTP-only Admin session (SSO & Password Recovery)
app.post('/api/admin/auth/google-session', async (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    const idToken = String(req.body.idToken || '');
    if (!idToken) {
      return res.status(400).json({ error: 'Missing Firebase ID token.' });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    if (!decoded || !decoded.email) {
      return res.status(401).json({ error: 'Invalid Google account token.' });
    }

    const cred = await getAdminCredentialRecord();
    if (
      cred &&
      cred.recoveryEmail &&
      cred.recoveryEmail.trim() !== '' &&
      cred.recoveryEmail.toLowerCase() !== decoded.email.toLowerCase()
    ) {
      await logSecurityEvent(
        'UNAUTHORIZED_GOOGLE_SSO',
        `Rejected Google sign-in from non-admin email: ${decoded.email}`,
        ip
      );
      return res.status(403).json({
        error: `Google account (${decoded.email}) is not the authorized recovery administrator.`,
      });
    }

    await getOrCreateUser(decoded.uid, decoded.email);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await createAdminSessionRecord({
      tokenHash,
      authMethod: 'google_recovery',
      ipAddress: ip,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 250),
      expiresAt,
    });

    await logSecurityEvent(
      'GOOGLE_SSO_SUCCESS',
      `Administrator authenticated via Google (${decoded.email}).`,
      ip
    );

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie(ADMIN_COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'none' : 'lax',
      expires: expiresAt,
      path: '/',
    });

    return res.json({
      authenticated: true,
      mustChangePassword: false,
      recoveryEmail: cred?.recoveryEmail || decoded.email,
      authMethod: 'google_recovery',
    });
  } catch (error: any) {
    console.error('Google session error:', error);
    return res.status(401).json({ error: 'Google authentication verification failed.' });
  }
});

app.post('/api/admin/auth/logout', async (req: Request, res: Response) => {
  try {
    const rawToken = req.cookies?.[ADMIN_COOKIE_NAME];
    if (rawToken && typeof rawToken === 'string') {
      const tokenHash = hashSessionToken(rawToken);
      await deleteAdminSessionByHash(tokenHash);
    }
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.clearCookie(ADMIN_COOKIE_NAME, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'none' : 'lax',
      path: '/',
    });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Logout failed.' });
  }
});

app.get('/api/admin/auth/session', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [cred, activeSessions, logs] = await Promise.all([
      getAdminCredentialRecord(),
      getActiveAdminSessions(),
      getRecentSecurityLogs(),
    ]);

    return res.json({
      authenticated: true,
      mustChangePassword:
        req.adminSession?.authMethod === 'google_recovery'
          ? false
          : Boolean(cred?.mustChangePassword),
      recoveryEmail: cred?.recoveryEmail || '',
      currentSession: req.adminSession,
      activeSessions,
      securityLogs: logs,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to check session.' });
  }
});

app.post('/api/admin/auth/change-password', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const ip = getClientIp(req);
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    const recoveryEmail =
      req.body.recoveryEmail !== undefined ? String(req.body.recoveryEmail).trim() : undefined;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters long.',
      });
    }

    const cred = await getAdminCredentialRecord();
    if (!cred) {
      return res.status(500).json({ error: 'Credential record not found.' });
    }

    // Require currentPassword unless signed in via verified Google Recovery session
    const isGoogleRecovery =
      req.adminSession?.authMethod === 'google_recovery' ||
      req.adminSession?.authMethod === 'firebase_google';

    if (!isGoogleRecovery) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required.' });
      }
      const currentHash = computePasswordHash(currentPassword, cred.passwordSalt);
      const expectedBuf = Buffer.from(cred.passwordHash, 'hex');
      const actualBuf = Buffer.from(currentHash, 'hex');
      const isMatch =
        expectedBuf.length === actualBuf.length &&
        crypto.timingSafeEqual(expectedBuf, actualBuf);

      if (!isMatch) {
        await logSecurityEvent(
          'PASSWORD_CHANGE_FAILED',
          'Incorrect current password supplied during password change.',
          ip
        );
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }
    }

    // Prevent reusing the initial default setup password hash
    const newWithInitialSalt = computePasswordHash(
      newPassword,
      '7f9a2b4c8d1e3f5a6b0c9d8e7f6a5b4c'
    );
    if (
      newWithInitialSalt ===
      '86d0e75c92f49064917e390881b923d35b3232ada6c11ef4cf0c43fcd339be6ec79453ddeb4b8d5f8bc2abcb84fcc622c0dbc84338d9d3f97b50dbfe60c892be'
    ) {
      return res.status(400).json({
        error: 'Please choose a new password different from the initial setup credential.',
      });
    }

    await updateAdminPassword(newPassword, recoveryEmail);
    await logSecurityEvent(
      'PASSWORD_CHANGED',
      'Administrator password was updated successfully.',
      ip
    );

    return res.json({ success: true, mustChangePassword: false });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update password.' });
  }
});

// ============================================================================
// ADMIN REAL-TIME NOTIFICATIONS & OVERVIEW ROUTES
// ============================================================================

app.get('/api/admin/notifications/stream', requireAuth, (req: AuthRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

app.post('/api/admin/notifications/test', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const channel = String(req.body.channel || 'email');
    const config = await getRawPrivateNotificationSettings();

    if (channel === 'email') {
      if (!config.smtp_host || !config.smtp_user || !config.smtp_pass || !config.notify_recipient_email) {
        return res.status(400).json({
          error:
            'SMTP Host, Username, Password, and Recipient Email must be saved before sending a test email.',
        });
      }
      const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: Number(config.smtp_port) || 587,
        secure: Number(config.smtp_port) === 465,
        auth: {
          user: config.smtp_user,
          pass: config.smtp_pass,
        },
      });
      await transporter.sendMail({
        from: config.smtp_from || config.smtp_user,
        to: config.notify_recipient_email,
        subject: '[PIVO] Test Administrator Notification',
        text: 'This is a real test email from your PIVO Admin Dashboard notification system.',
      });
      return res.json({ success: true, message: `Test email sent to ${config.notify_recipient_email}` });
    }

    if (channel === 'telegram') {
      if (!config.telegram_bot_token || !config.telegram_chat_id) {
        return res.status(400).json({
          error: 'Telegram Bot Token and Chat ID must be saved before sending a test message.',
        });
      }
      const tgRes = await fetch(
        `https://api.telegram.org/bot${encodeURIComponent(config.telegram_bot_token)}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.telegram_chat_id,
            text: '✅ *PIVO Admin Dashboard*: Telegram notification integration is active.',
            parse_mode: 'Markdown',
          }),
        }
      );
      if (!tgRes.ok) {
        const errBody = await tgRes.text();
        return res.status(400).json({ error: `Telegram API rejected request: ${errBody}` });
      }
      return res.json({ success: true, message: 'Test Telegram message delivered.' });
    }

    return res.status(400).json({ error: 'Unknown notification channel.' });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Notification test failed. Check your credentials.',
    });
  }
});

// ============================================================================
// ADMIN PORTFOLIO / WORK ROUTES
// ============================================================================

app.get('/api/admin/projects', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const items = await getAllProjectsAdmin();
    return res.json(items);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to load projects.' });
  }
});

app.post('/api/admin/projects', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    const category = String(req.body.category || '').trim();
    const imageUrl = String(req.body.imageUrl || '').trim();
    const destinationUrl = String(req.body.destinationUrl || '').trim();
    const isPublished = Boolean(req.body.isPublished);
    const isDemo = Boolean(req.body.isDemo);
    const displayOrder = Number(req.body.displayOrder) || 1;

    if (!title) return res.status(400).json({ error: 'Project title is required.' });
    if (!description) return res.status(400).json({ error: 'Project description is required.' });
    if (!imageUrl) return res.status(400).json({ error: 'Project cover image is required.' });
    if (destinationUrl && !isSafeUrl(destinationUrl, false)) {
      return res.status(400).json({
        error: 'Destination URL must be a valid http:// or https:// address.',
      });
    }

    const created = await createProjectAdmin({
      title,
      description,
      category,
      imageUrl,
      destinationUrl,
      isPublished,
      isDemo,
      displayOrder,
    });
    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create project.' });
  }
});

app.put('/api/admin/projects/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid project ID.' });
    }

    const updates: Record<string, any> = {};
    if (req.body.title !== undefined) {
      const t = String(req.body.title).trim();
      if (!t) return res.status(400).json({ error: 'Project title cannot be empty.' });
      updates.title = t;
    }
    if (req.body.description !== undefined) {
      const d = String(req.body.description).trim();
      if (!d) return res.status(400).json({ error: 'Project description cannot be empty.' });
      updates.description = d;
    }
    if (req.body.category !== undefined) updates.category = String(req.body.category).trim();
    if (req.body.imageUrl !== undefined) updates.imageUrl = String(req.body.imageUrl).trim();
    if (req.body.destinationUrl !== undefined) {
      const u = String(req.body.destinationUrl).trim();
      if (u && !isSafeUrl(u, false)) {
        return res.status(400).json({
          error: 'Destination URL must be a valid http:// or https:// address.',
        });
      }
      updates.destinationUrl = u;
    }
    if (req.body.isPublished !== undefined) updates.isPublished = Boolean(req.body.isPublished);
    if (req.body.isDemo !== undefined) updates.isDemo = Boolean(req.body.isDemo);
    if (req.body.displayOrder !== undefined) updates.displayOrder = Number(req.body.displayOrder);

    const updated = await updateProjectAdmin(id, updates);
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update project.' });
  }
});

app.post('/api/admin/projects/reorder', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orderedIds = Array.isArray(req.body.orderedIds)
      ? req.body.orderedIds.map(Number).filter((n: number) => Number.isInteger(n) && n > 0)
      : [];
    await reorderProjectsAdmin(orderedIds);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to reorder projects.' });
  }
});

app.delete('/api/admin/projects/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid project ID.' });
    }
    await deleteProjectAdmin(id);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete project.' });
  }
});

// ============================================================================
// ADMIN ORDERS ROUTES
// ============================================================================

app.get('/api/admin/orders', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const list = await getAllOrdersAdmin();
    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to load orders.' });
  }
});

app.patch('/api/admin/orders/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid order ID.' });
    }
    const allowedStatuses = ['New', 'Contacted', 'In Progress', 'Completed', 'Cancelled'];
    const updates: Record<string, any> = {};

    if (req.body.status !== undefined) {
      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({ error: 'Invalid order status.' });
      }
      updates.status = req.body.status;
    }
    if (req.body.isRead !== undefined) {
      updates.isRead = Boolean(req.body.isRead);
    }
    if (req.body.adminNotes !== undefined) {
      updates.adminNotes = String(req.body.adminNotes);
    }

    const updated = await updateOrderAdmin(id, updates);
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update order.' });
  }
});

app.delete('/api/admin/orders/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid order ID.' });
    }
    await deleteOrderAdmin(id);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete order.' });
  }
});

// ============================================================================
// ADMIN WEBSITE SETTINGS & NOTIFICATIONS CONFIG ROUTES
// ============================================================================

app.get('/api/admin/settings', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const data = await getAllSettingsAdmin();
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to load settings.' });
  }
});

app.put('/api/admin/settings/public', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const settings = req.body.settings;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings payload.' });
    }

    // Validate button destination URLs if present
    if (settings.hero_primary_cta_url && !isSafeUrl(settings.hero_primary_cta_url, true)) {
      return res.status(400).json({ error: 'Unsafe primary CTA destination URL.' });
    }
    if (settings.hero_secondary_cta_url && !isSafeUrl(settings.hero_secondary_cta_url, true)) {
      return res.status(400).json({ error: 'Unsafe secondary CTA destination URL.' });
    }

    const sanitized: Record<string, string> = {};
    for (const [k, v] of Object.entries(settings)) {
      sanitized[k] = String(v ?? '');
    }

    await upsertSettingsBatch(sanitized, true);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to save website content.' });
  }
});

app.put(
  '/api/admin/settings/notifications',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const updates: Record<string, string> = {};
      if (req.body.notify_email_enabled !== undefined) {
        updates.notify_email_enabled = req.body.notify_email_enabled ? 'true' : 'false';
      }
      if (req.body.notify_recipient_email !== undefined) {
        updates.notify_recipient_email = String(req.body.notify_recipient_email).trim();
      }
      if (req.body.smtp_host !== undefined) {
        updates.smtp_host = String(req.body.smtp_host).trim();
      }
      if (req.body.smtp_port !== undefined) {
        updates.smtp_port = String(req.body.smtp_port).trim();
      }
      if (req.body.smtp_user !== undefined) {
        updates.smtp_user = String(req.body.smtp_user).trim();
      }
      if (req.body.smtp_from !== undefined) {
        updates.smtp_from = String(req.body.smtp_from).trim();
      }
      if (req.body.smtp_pass && String(req.body.smtp_pass).trim() !== '') {
        updates.smtp_pass = String(req.body.smtp_pass).trim();
      }
      if (req.body.notify_telegram_enabled !== undefined) {
        updates.notify_telegram_enabled = req.body.notify_telegram_enabled ? 'true' : 'false';
      }
      if (req.body.telegram_chat_id !== undefined) {
        updates.telegram_chat_id = String(req.body.telegram_chat_id).trim();
      }
      if (req.body.telegram_bot_token && String(req.body.telegram_bot_token).trim() !== '') {
        updates.telegram_bot_token = String(req.body.telegram_bot_token).trim();
      }

      await upsertSettingsBatch(updates, false);
      return res.json({ success: true });
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: error.message || 'Failed to save notification settings.' });
    }
  }
);

// ============================================================================
// ADMIN MEDIA LIBRARY ROUTES
// ============================================================================

const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

app.get('/api/admin/media', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const items = await getAllMediaAdmin();
    return res.json(items);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to load media library.' });
  }
});

app.post('/api/admin/media', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const fileName = String(req.body.fileName || '').trim();
    const mimeType = String(req.body.mimeType || '').trim();
    const dataUrl = String(req.body.dataUrl || '').trim();
    const sizeBytes = Number(req.body.sizeBytes) || dataUrl.length;

    if (!fileName || !dataUrl) {
      return res.status(400).json({ error: 'File name and image data are required.' });
    }
    if (!ALLOWED_IMAGE_MIMES.includes(mimeType)) {
      return res.status(400).json({
        error: 'Unsupported file format. Allowed formats: PNG, JPG, WEBP, GIF, SVG.',
      });
    }
    if (sizeBytes > 6 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image size must be under 6 MB.' });
    }

    const created = await createMediaItemAdmin({
      fileName,
      mimeType,
      sizeBytes,
      dataUrl,
    });
    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to upload image.' });
  }
});

app.put('/api/admin/media/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid media ID.' });
    }
    const fileName = String(req.body.fileName || '').trim();
    const mimeType = String(req.body.mimeType || '').trim();
    const dataUrl = String(req.body.dataUrl || '').trim();
    const sizeBytes = Number(req.body.sizeBytes) || dataUrl.length;

    if (!fileName || !dataUrl) {
      return res.status(400).json({ error: 'File name and image data are required.' });
    }
    if (!ALLOWED_IMAGE_MIMES.includes(mimeType)) {
      return res.status(400).json({
        error: 'Unsupported file format. Allowed formats: PNG, JPG, WEBP, GIF, SVG.',
      });
    }

    const updated = await replaceMediaItemAdmin(id, {
      fileName,
      mimeType,
      sizeBytes,
      dataUrl,
    });
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to replace image.' });
  }
});

app.delete('/api/admin/media/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid media ID.' });
    }
    await deleteMediaItemAdmin(id);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete media item.' });
  }
});

// ============================================================================
// ADMIN NAVIGATION & LINKS ROUTES
// ============================================================================

app.get('/api/admin/links', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const links = await getAllNavigationLinksAdmin();
    return res.json(links);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to load navigation links.' });
  }
});

app.post('/api/admin/links', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const label = String(req.body.label || '').trim();
    const destinationUrl = String(req.body.destinationUrl || '').trim();
    const placement = String(req.body.placement || 'header').trim();
    const displayOrder = Number(req.body.displayOrder) || 1;
    const isEnabled = Boolean(req.body.isEnabled);
    const openInNewTab = Boolean(req.body.openInNewTab);

    if (!label) return res.status(400).json({ error: 'Link label is required.' });
    if (destinationUrl && !isSafeUrl(destinationUrl, true)) {
      return res.status(400).json({
        error: 'Unsafe or invalid URL protocol. Blocked protocols: javascript:, data:, vbscript:.',
      });
    }

    const created = await createNavigationLinkAdmin({
      label,
      destinationUrl,
      placement,
      displayOrder,
      isEnabled,
      openInNewTab,
    });
    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create navigation link.' });
  }
});

app.put('/api/admin/links/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid link ID.' });
    }
    const updates: Record<string, any> = {};
    if (req.body.label !== undefined) {
      const l = String(req.body.label).trim();
      if (!l) return res.status(400).json({ error: 'Link label cannot be empty.' });
      updates.label = l;
    }
    if (req.body.destinationUrl !== undefined) {
      const u = String(req.body.destinationUrl).trim();
      if (u && !isSafeUrl(u, true)) {
        return res.status(400).json({
          error: 'Unsafe or invalid URL protocol. Blocked protocols: javascript:, data:, vbscript:.',
        });
      }
      updates.destinationUrl = u;
    }
    if (req.body.placement !== undefined) updates.placement = String(req.body.placement).trim();
    if (req.body.displayOrder !== undefined) updates.displayOrder = Number(req.body.displayOrder);
    if (req.body.isEnabled !== undefined) updates.isEnabled = Boolean(req.body.isEnabled);
    if (req.body.openInNewTab !== undefined) updates.openInNewTab = Boolean(req.body.openInNewTab);

    const updated = await updateNavigationLinkAdmin(id, updates);
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update navigation link.' });
  }
});

app.post('/api/admin/links/reorder', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orderedIds = Array.isArray(req.body.orderedIds)
      ? req.body.orderedIds.map(Number).filter((n: number) => Number.isInteger(n) && n > 0)
      : [];
    await reorderNavigationLinksAdmin(orderedIds);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to reorder links.' });
  }
});

app.delete('/api/admin/links/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid link ID.' });
    }
    await deleteNavigationLinkAdmin(id);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete link.' });
  }
});

// ============================================================================
// VITE DEV MIDDLEWARE / STATIC SPA FALLBACK
// ============================================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PIVO server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
