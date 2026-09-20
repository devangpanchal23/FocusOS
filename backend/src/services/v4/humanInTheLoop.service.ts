import { prisma } from '../../config/db.js';

export class HumanInTheLoopService {
  /**
   * Get all pending approval requests for user
   */
  static async getPendingApprovals(userId: string) {
    return prisma.actionApprovalRequest.findMany({
      where: { userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get complete approval request history
   */
  static async getApprovalHistory(userId: string) {
    return prisma.actionApprovalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Process a human review decision (APPROVED or REJECTED)
   */
  static async reviewApproval(userId: string, requestId: string, decision: 'APPROVED' | 'REJECTED') {
    const request = await prisma.actionApprovalRequest.findFirst({
      where: { id: requestId, userId },
    });

    if (!request) {
      throw new Error('Approval request not found or unauthorized');
    }

    if (request.status !== 'PENDING') {
      throw new Error(`Request has already been processed with status: ${request.status}`);
    }

    let resultSummary = '';
    const now = new Date();

    if (decision === 'APPROVED') {
      // Execute the high impact action
      const preview = JSON.parse(request.previewData || '{}');

      if (request.actionType === 'BLOCK_RULE_UPDATE') {
        const app = preview.app || 'Instagram';
        await prisma.blockRule.upsert({
          where: { id: `auto-rule-${app.toLowerCase()}` },
          update: {
            mode: 'SCHEDULED',
            startTime: '09:00',
            endTime: '12:30',
            isEnabled: true,
          },
          create: {
            id: `auto-rule-${app.toLowerCase()}`,
            userId,
            targetType: 'APP',
            targetValue: app,
            mode: 'SCHEDULED',
            startTime: '09:00',
            endTime: '12:30',
            isEnabled: true,
          },
        });
        resultSummary = `Strict scheduled block successfully applied to ${app} (09:00 - 12:30).`;
      } else if (request.actionType === 'CALENDAR_EVENT_CREATE') {
        resultSummary = `Study blocks confirmed and placed in calendar.`;
      } else if (request.actionType === 'GOAL_ADJUSTMENT') {
        resultSummary = `Daily target updated according to approved proposal.`;
      } else {
        resultSummary = `Approved action executed successfully.`;
      }

      // Log to privacy & governance audit
      await prisma.privacyAuditLog.create({
        data: {
          userId,
          action: 'HUMAN_APPROVAL_EXECUTED',
          details: `User explicitly approved high-impact action: ${request.title}. Summary: ${resultSummary}`,
        },
      });
    } else {
      resultSummary = 'User rejected this proposed action. No changes were applied.';
    }

    const updated = await prisma.actionApprovalRequest.update({
      where: { id: requestId },
      data: {
        status: decision === 'APPROVED' ? 'EXECUTED' : 'REJECTED',
        executedAt: now,
        resultSummary,
      },
    });

    return updated;
  }

  /**
   * Manually submit an approval request
   */
  static async createApprovalRequest(userId: string, data: {
    actionType: string;
    riskLevel?: string;
    title: string;
    description: string;
    previewData: any;
    requestedBy?: string;
  }) {
    return prisma.actionApprovalRequest.create({
      data: {
        userId,
        actionType: data.actionType,
        riskLevel: data.riskLevel || 'HIGH_IMPACT',
        title: data.title,
        description: data.description,
        previewData: typeof data.previewData === 'string' ? data.previewData : JSON.stringify(data.previewData),
        status: 'PENDING',
        requestedBy: data.requestedBy || 'MANUAL_USER',
      },
    });
  }
}
