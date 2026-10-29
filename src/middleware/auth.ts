import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { getOrCreateUser } from '../db/users.ts';
import { verifyAdminSessionToken } from '../db/repository.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  adminSession?: {
    id: number;
    authMethod: string;
    ipAddress: string;
    userAgent: string;
    expiresAt: Date;
    createdAt: Date;
    email?: string;
  };
}

export const ADMIN_COOKIE_NAME = 'pivo_admin_session';

export function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Check HTTP-only session cookie first
    const sessionToken = req.cookies?.[ADMIN_COOKIE_NAME];
    if (sessionToken && typeof sessionToken === 'string') {
      const tokenHash = hashSessionToken(sessionToken);
      const sessionRecord = await verifyAdminSessionToken(tokenHash);
      if (sessionRecord) {
        req.adminSession = sessionRecord;
        return next();
      }
    }

    // 2. Check Firebase Bearer token (for Google Sign-In / SSO recovery)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await adminAuth.verifyIdToken(token);
      if (decodedToken && decodedToken.email) {
        await getOrCreateUser(decodedToken.uid, decodedToken.email);
        req.user = decodedToken;
        req.adminSession = {
          id: 0,
          authMethod: 'firebase_google',
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || '',
          expiresAt: new Date(decodedToken.exp * 1000),
          createdAt: new Date(decodedToken.iat * 1000),
          email: decodedToken.email,
        };
        return next();
      }
    }

    return res.status(401).json({ error: 'Unauthorized: Administrator authentication required.' });
  } catch (error) {
    console.error('Authentication verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session.' });
  }
};
