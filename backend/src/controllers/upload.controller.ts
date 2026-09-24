import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { calculateFileHash, ocrAnalyzer } from '../services/ocr.service.js';
import * as StorageService from '../services/storage.service.js';
import { NormalizationService } from '../services/normalization.service.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { parseDurationToMinutes } from '../utils/durationParser.js';
import { EventStoreService } from '../services/v5/eventStore.service.js';

export class UploadController {
  /**
   * Upload multiple screenshots & run AI/OCR extraction
   */
  static async uploadScreenshots(req: AuthenticatedRequest, res: Response) {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No screenshot files uploaded.' });
      }

      const userId = req.userId!;
      const selectedDeviceId = req.body.deviceId || null;
      const targetDate = req.body.date || new Date().toISOString().split('T')[0];

      const results = [];

      for (const file of files) {
        const fileHash = calculateFileHash(file.path);

        // Check duplicate screenshot
        const existingScreenshot = await prisma.screenshot.findFirst({
          where: { userId, fileHash },
        });

        const isDuplicate = !!existingScreenshot;

        // Run OCR / Vision Extraction on the temp-staged file BEFORE moving it
        // to permanent storage (persistFile deletes the temp copy on success).
        const analysis = await ocrAnalyzer.analyze(file.path, file.originalname);

        // Move the temp-staged file into permanent storage (local ./uploads
        // in dev, Vercel Blob in production — see storage.service.ts).
        const { filePath: storedFilePath } = await StorageService.persistFile(
          file.path,
          file.filename,
          file.mimetype
        );

        // Create Screenshot record
        const screenshot = await prisma.screenshot.create({
          data: {
            userId,
            deviceId: selectedDeviceId,
            filePath: storedFilePath,
            fileHash,
            originalName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            status: isDuplicate ? 'DUPLICATE' : 'PROCESSING',
          },
        });

        // Save Extraction record
        const extraction = await prisma.extraction.create({
          data: {
            screenshotId: screenshot.id,
            detectedDate: analysis.detectedDate || targetDate,
            detectedDevice: analysis.detectedDevice,
            screenshotClass: analysis.screenshotClass,
            confidence: analysis.confidence,
            rawText: analysis.rawSummary,
            status: isDuplicate ? 'NEEDS_REVIEW' : 'NEEDS_REVIEW',
          },
        });

        // Save Extraction Fields
        const fieldsData = [];

        if (analysis.totalScreenTime) {
          fieldsData.push({
            extractionId: extraction.id,
            fieldKey: 'totalScreenTime',
            detectedValue: analysis.totalScreenTime,
            confirmedValue: analysis.totalScreenTime,
            confidence: analysis.confidence,
            status: 'DETECTED',
          });
        }

        if (analysis.notifications) {
          fieldsData.push({
            extractionId: extraction.id,
            fieldKey: 'notifications',
            detectedValue: analysis.notifications.toString(),
            confirmedValue: analysis.notifications.toString(),
            confidence: 0.95,
            status: 'DETECTED',
          });
        }

        if (analysis.unlocks) {
          fieldsData.push({
            extractionId: extraction.id,
            fieldKey: 'unlocks',
            detectedValue: analysis.unlocks.toString(),
            confirmedValue: analysis.unlocks.toString(),
            confidence: 0.95,
            status: 'DETECTED',
          });
        }

        for (const app of analysis.applications) {
          fieldsData.push({
            extractionId: extraction.id,
            fieldKey: `app:${app.name}`,
            detectedValue: JSON.stringify({
              appName: app.name,
              duration: app.duration,
              activeMinutes: app.activeMinutes,
              backgroundDuration: app.backgroundDuration,
              backgroundMinutes: app.backgroundMinutes,
              shortsDuration: app.shortsDuration,
              reelCount: app.reelCount,
              category: app.category,
            }),
            confirmedValue: app.duration,
            confidence: app.confidence,
            categorySuggestion: app.category,
            status: 'DETECTED',
          });
        }

        for (const f of fieldsData) {
          await prisma.extractionField.create({ data: f });
        }

        // Update screenshot status
        await prisma.screenshot.update({
          where: { id: screenshot.id },
          data: { status: isDuplicate ? 'DUPLICATE' : 'EXTRACTED' },
        });

        results.push({
          screenshotId: screenshot.id,
          originalName: screenshot.originalName,
          filePath: StorageService.getPublicUrl(storedFilePath),
          isDuplicate,
          classification: analysis.screenshotClass,
          confidence: analysis.confidence,
          extractionId: extraction.id,
          detectedDate: analysis.detectedDate,
          detectedAppsCount: analysis.applications.length,
        });
      }

      return res.status(201).json({
        message: `Successfully processed ${results.length} screenshots.`,
        uploads: results,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      return res.status(500).json({ error: 'Failed to process screenshot uploads.' });
    }
  }

  /**
   * List all uploaded screenshots with extraction status
   */
  static async getUploads(req: AuthenticatedRequest, res: Response) {
    try {
      const screenshots = await prisma.screenshot.findMany({
        where: { userId: req.userId },
        include: {
          device: true,
          extractions: {
            include: {
              fields: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = screenshots.map((s) => ({
        id: s.id,
        originalName: s.originalName,
        filePath: StorageService.getPublicUrl(s.filePath),
        status: s.status,
        device: s.device?.name || 'Unassigned Device',
        createdAt: s.createdAt,
        extraction: s.extractions[0]
          ? {
              id: s.extractions[0].id,
              classification: s.extractions[0].screenshotClass,
              confidence: s.extractions[0].confidence,
              detectedDate: s.extractions[0].detectedDate,
              status: s.extractions[0].status,
              fieldsCount: s.extractions[0].fields.length,
            }
          : null,
      }));

      return res.json({ uploads: formatted });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch uploads.' });
    }
  }

  /**
   * Get single extraction details with original screenshot for verification
   */
  static async getExtraction(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const extraction = await prisma.extraction.findUnique({
        where: { id },
        include: {
          screenshot: {
            include: { device: true },
          },
          fields: true,
        },
      });

      if (!extraction || extraction.screenshot.userId !== req.userId) {
        return res.status(404).json({ error: 'Extraction not found.' });
      }

      return res.json({
        extraction: {
          ...extraction,
          screenshotUrl: StorageService.getPublicUrl(extraction.screenshot.filePath),
        },
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch extraction details.' });
    }
  }

  /**
   * Human Verification: User confirms or edits extracted fields and applies them to UsageRecords
   */
  static async confirmExtraction(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { editedFields, confirmedDate, confirmedDeviceId } = req.body;
      const userId = req.userId!;

      const extraction = await prisma.extraction.findUnique({
        where: { id },
        include: {
          screenshot: true,
          fields: true,
        },
      });

      if (!extraction || extraction.screenshot.userId !== userId) {
        return res.status(404).json({ error: 'Extraction not found.' });
      }

      const effectiveDate = confirmedDate || extraction.detectedDate || new Date().toISOString().split('T')[0];
      const effectiveDeviceId = confirmedDeviceId || extraction.screenshot.deviceId || null;

      // Map of edited values by fieldKey
      const editMap = new Map<string, any>();
      if (Array.isArray(editedFields)) {
        for (const ef of editedFields) {
          editMap.set(ef.fieldKey, ef);
        }
      }

      let detectedNotifications = 0;
      let detectedUnlocks = 0;

      // Process each field into confirmed UsageRecord
      for (const f of extraction.fields) {
        const edit = editMap.get(f.fieldKey);
        const status = edit ? 'EDITED' : 'CONFIRMED';
        const confirmedVal = edit ? edit.value : f.confirmedValue || f.detectedValue;

        await prisma.extractionField.update({
          where: { id: f.id },
          data: {
            confirmedValue: typeof confirmedVal === 'string' ? confirmedVal : JSON.stringify(confirmedVal),
            status,
          },
        });

        if (f.fieldKey === 'notifications') {
          detectedNotifications = parseInt(confirmedVal, 10) || 0;
        } else if (f.fieldKey === 'unlocks') {
          detectedUnlocks = parseInt(confirmedVal, 10) || 0;
        } else if (f.fieldKey.startsWith('app:')) {
          let appData: any = {};
          try {
            appData = JSON.parse(f.detectedValue);
          } catch {
            appData = { appName: f.fieldKey.replace('app:', ''), duration: f.detectedValue };
          }

          const finalName = edit?.appName || appData.appName || f.fieldKey.replace('app:', '');
          const finalDurationStr = edit?.duration || appData.duration || confirmedVal;
          const finalActiveMinutes =
            edit?.activeMinutes !== undefined
              ? edit.activeMinutes
              : parseDurationToMinutes(finalDurationStr);
          const finalBgMinutes =
            edit?.backgroundMinutes !== undefined
              ? edit.backgroundMinutes
              : appData.backgroundMinutes || parseDurationToMinutes(appData.backgroundDuration || '0m');
          const finalReelCount = edit?.reelCount !== undefined ? edit.reelCount : appData.reelCount || 0;
          const finalShortsMinutes =
            edit?.shortsMinutes !== undefined
              ? edit.shortsMinutes
              : appData.shortsDuration
              ? parseDurationToMinutes(appData.shortsDuration)
              : finalReelCount > 0
              ? Math.round(finalActiveMinutes * 0.7)
              : 0;

          // Normalize application and category
          const app = await NormalizationService.resolveApplication(finalName, edit?.category || appData.category);

          // Create or update UsageRecord
          const createdUsageRecord = await prisma.usageRecord.create({
            data: {
              userId,
              deviceId: effectiveDeviceId,
              applicationId: app.id,
              categoryId: app.defaultCategoryId,
              screenshotId: extraction.screenshotId,
              date: effectiveDate,
              activeMinutes: finalActiveMinutes,
              backgroundMinutes: finalBgMinutes,
              reelCount: finalReelCount,
              shortsMinutes: finalShortsMinutes,
              source: 'AI_EXTRACTED',
              confidence: f.confidence,
              status: 'CONFIRMED',
            },
          });

          EventStoreService.writeFromUsageRecord(
            userId,
            {
              id: createdUsageRecord.id,
              applicationId: createdUsageRecord.applicationId,
              categoryId: createdUsageRecord.categoryId,
              deviceId: createdUsageRecord.deviceId,
              date: createdUsageRecord.date,
              activeMinutes: createdUsageRecord.activeMinutes,
              confidence: createdUsageRecord.confidence,
            },
            { applicationName: finalName, categoryName: edit?.category || appData.category }
          ).catch((err) => console.error('EventStoreService.writeFromUsageRecord adapter error:', err));
        }
      }

      // Mark extraction and screenshot as confirmed
      await prisma.extraction.update({
        where: { id },
        data: { status: 'CONFIRMED' },
      });

      await prisma.screenshot.update({
        where: { id: extraction.screenshotId },
        data: { status: 'CONFIRMED' },
      });

      // Recalculate daily metric for that date
      const updatedMetric = await AnalyticsService.recalculateDailyMetric(userId, effectiveDate);

      // If unlocks/notifications were detected, update them on the metric
      if (detectedNotifications > 0 || detectedUnlocks > 0) {
        await prisma.dailyMetric.update({
          where: { id: updatedMetric.id },
          data: {
            notificationCount: detectedNotifications > 0 ? detectedNotifications : undefined,
            unlockCount: detectedUnlocks > 0 ? detectedUnlocks : undefined,
          },
        });
      }

      return res.json({
        message: 'Extraction successfully verified and applied to analytics.',
        date: effectiveDate,
      });
    } catch (error: any) {
      console.error('Confirmation error:', error);
      return res.status(500).json({ error: 'Failed to confirm extraction data.' });
    }
  }

  /**
   * Reject extraction
   */
  static async rejectExtraction(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const extraction = await prisma.extraction.findUnique({
        where: { id },
        include: { screenshot: true },
      });

      if (!extraction || extraction.screenshot.userId !== req.userId) {
        return res.status(404).json({ error: 'Extraction not found.' });
      }

      await prisma.extraction.update({
        where: { id },
        data: { status: 'REJECTED' },
      });

      await prisma.screenshot.update({
        where: { id: extraction.screenshotId },
        data: { status: 'FAILED' },
      });

      return res.json({ message: 'Extraction rejected.' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to reject extraction.' });
    }
  }
}
