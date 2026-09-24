import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { jwtOrSyncTokenMiddleware } from '../../middleware/jwtOrSyncToken.middleware.js';
import { DesktopAgentController } from '../../controllers/v5/desktopAgent.controller.js';

// §33 desktop-completion privacy settings endpoints, kept in their own
// router so this slice doesn't need to touch v5.routes.ts (mounted
// elsewhere at /api/v5/desktop alongside desktopRouter). Final URLs:
//   GET /api/v5/desktop/settings
//   PUT /api/v5/desktop/settings
//
// GET accepts EITHER a JWT (frontend settings UI, reads/displays current
// settings) OR an X-Sync-Token (the unattended desktop agent, which only
// holds a sync-token, fetches settings to apply privacy filtering
// client-side too). PUT stays JWT-only — only the user-facing UI should
// ever change these settings, never the unattended agent.
export const desktopSettingsRouter = Router();

desktopSettingsRouter.get('/settings', jwtOrSyncTokenMiddleware, DesktopAgentController.getSettings);
desktopSettingsRouter.put('/settings', authMiddleware, DesktopAgentController.updateSettings);
