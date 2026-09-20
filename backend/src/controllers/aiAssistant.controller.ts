import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { AiAssistantService } from '../services/aiAssistant.service.js';

export class AiAssistantController {
  static async getHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const messages = await AiAssistantService.getHistory(userId);
      res.json({ messages });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch AI chat history' });
    }
  }

  static async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { content, sessionId } = req.body;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      if (!content || typeof content !== 'string') {
        res.status(400).json({ error: 'Message content is required' });
        return;
      }

      const response = await AiAssistantService.askAssistant(userId, content, sessionId);
      res.json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to generate AI assistant reply' });
    }
  }

  static async clearHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await AiAssistantService.clearHistory(userId);
      res.json({ success: true, message: 'Chat history cleared' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to clear chat history' });
    }
  }
}
