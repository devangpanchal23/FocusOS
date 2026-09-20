import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'focus_intelligence_secret_key_super_secure_jwt_token_2026';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, name, timezone } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required.' });
      }

      const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (existing) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          name,
          timezone: timezone || 'Asia/Kolkata',
          profile: {
            create: {
              sleepSchedule: '23:30 - 07:00',
              workHours: '09:00 - 18:00',
            },
          },
        },
        include: { profile: true },
      });

      // Default primary device
      await prisma.device.create({
        data: {
          userId: user.id,
          name: 'Primary Phone',
          deviceType: 'PHONE',
          os: 'ANDROID',
          timezone: user.timezone,
        },
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          timezone: user.timezone,
          dailyTargetMinutes: user.dailyTargetMinutes,
        },
        token,
      });
    } catch (error: any) {
      console.error('Register error:', error);
      return res.status(500).json({ error: 'Failed to create account.' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { profile: true },
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          timezone: user.timezone,
          dailyTargetMinutes: user.dailyTargetMinutes,
          profile: user.profile,
        },
        token,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Authentication failed.' });
    }
  }

  static async me(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: { profile: true, devices: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          timezone: user.timezone,
          dailyTargetMinutes: user.dailyTargetMinutes,
          profile: user.profile,
          devices: user.devices,
        },
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, timezone, dailyTargetMinutes, sleepSchedule, workHours } = req.body;

      const user = await prisma.user.update({
        where: { id: req.userId },
        data: {
          name: name || undefined,
          timezone: timezone || undefined,
          dailyTargetMinutes: dailyTargetMinutes !== undefined ? parseInt(dailyTargetMinutes, 10) : undefined,
          profile: {
            upsert: {
              create: { sleepSchedule, workHours },
              update: { sleepSchedule, workHours },
            },
          },
        },
        include: { profile: true },
      });

      return res.json({ user });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update profile.' });
    }
  }
}
