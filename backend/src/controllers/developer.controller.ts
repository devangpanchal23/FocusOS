import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { DeveloperService } from '../services/developer.service.js';

export class DeveloperController {
  static async getApiKeys(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const keys = await DeveloperService.getApiKeys(userId);
      res.json({ keys });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch API keys' });
    }
  }

  static async createApiKey(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { name, scopes } = req.body;
      if (!name) {
        res.status(400).json({ error: 'Key name is required' });
        return;
      }

      const key = await DeveloperService.createApiKey(userId, name, scopes);
      res.status(201).json({ key });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create API key' });
    }
  }

  static async revokeApiKey(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { keyId } = req.params;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await DeveloperService.revokeApiKey(userId, keyId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to revoke API key' });
    }
  }

  static async getWebhooks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const webhooks = await DeveloperService.getWebhooks(userId);
      res.json({ webhooks });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch webhooks' });
    }
  }

  static async createWebhook(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { url, events } = req.body;
      if (!url) {
        res.status(400).json({ error: 'Webhook endpoint URL is required' });
        return;
      }

      const webhook = await DeveloperService.createWebhook(userId, {
        url,
        events: events || ['focus.completed', 'goal.achieved']
      });

      res.status(201).json({ webhook });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create webhook' });
    }
  }

  static async deleteWebhook(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { webhookId } = req.params;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await DeveloperService.deleteWebhook(userId, webhookId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete webhook' });
    }
  }

  static async testWebhook(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { webhookId } = req.params;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await DeveloperService.testWebhook(userId, webhookId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to test webhook' });
    }
  }
}
