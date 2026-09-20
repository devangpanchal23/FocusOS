export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
  dailyTargetMinutes: number;
  profile?: {
    sleepSchedule?: string;
    workHours?: string;
    bio?: string;
  };
}

export interface Device {
  id: string;
  name: string;
  deviceType: 'PHONE' | 'LAPTOP' | 'DESKTOP' | 'TABLET' | 'OTHER';
  os: 'ANDROID' | 'WINDOWS' | 'MACOS' | 'IOS' | 'LINUX' | 'OTHER';
  timezone: string;
  lastSyncAt?: string;
  status: string;
  _count?: {
    screenshots: number;
    usageRecords: number;
  };
}

export interface ExtractionField {
  id: string;
  fieldKey: string;
  detectedValue: string;
  confirmedValue?: string;
  confidence: number;
  categorySuggestion?: string;
  status: 'DETECTED' | 'EDITED' | 'CONFIRMED' | 'REJECTED';
}

export interface Extraction {
  id: string;
  screenshotId: string;
  detectedDate?: string;
  detectedDevice?: string;
  screenshotClass: string;
  confidence: number;
  rawText?: string;
  status: 'NEEDS_REVIEW' | 'CONFIRMED' | 'REJECTED';
  fields: ExtractionField[];
  screenshotUrl?: string;
  screenshot?: {
    id: string;
    originalName: string;
    filePath: string;
    device?: Device;
  };
}

export interface UploadItem {
  id: string;
  originalName: string;
  filePath: string;
  status: string;
  device: string;
  createdAt: string;
  extraction: {
    id: string;
    classification: string;
    confidence: number;
    detectedDate?: string;
    status: string;
    fieldsCount: number;
  } | null;
}

export interface TopApp {
  id: string;
  name: string;
  category: string;
  categoryColor: string;
  activeMinutes: number;
  activeFormatted: string;
  backgroundMinutes: number;
  backgroundFormatted: string;
  percentage: number;
  shortsMinutes: number;
  reelCount: number;
  deviceName: string;
}

export interface CategoryMetric {
  name: string;
  minutes: number;
  formatted: string;
  color: string;
  percentage: number;
}

export interface DeviceMetric {
  name: string;
  type: string;
  os: string;
  minutes: number;
  formatted: string;
  percentage: number;
}

export interface DailyOverview {
  date: string;
  metrics: {
    screenTime: {
      minutes: number;
      formatted: string;
      diffMinutes: number;
      diffFormatted: string;
      diffPercent: number;
      isHigher: boolean;
    };
    shortForm: {
      minutes: number;
      formatted: string;
      reelCount: number;
      diffMinutes: number;
      diffFormatted: string;
      diffPercent: number;
      percentageOfScreenTime: number;
    };
    focusTime: {
      minutes: number;
      formatted: string;
      diffMinutes: number;
      diffPercent: number;
    };
    attentionScore: {
      score: number;
      breakdown: {
        score: number;
        factors: {
          label: string;
          points: number;
          description: string;
          type: 'positive' | 'negative' | 'neutral';
        }[];
      };
    };
    notifications: number;
    unlocks: number;
    topApp: TopApp | null;
    scrollCost: {
      minutes: number;
      formatted: string;
      hours: number;
      equivalents: {
        label: string;
        value: string;
        icon: string;
      }[];
    };
  };
  topApps: TopApp[];
  categoryBreakdown: CategoryMetric[];
  deviceBreakdown: DeviceMetric[];
  coverage: {
    status: string;
    confidence: number;
  };
}

export interface TrendDay {
  date: string;
  day: string;
  screenTimeMinutes: number;
  screenTimeHours: number;
  shortFormMinutes: number;
  shortFormHours: number;
  productiveMinutes: number;
  productiveHours: number;
  attentionScore: number;
  reelCount: number;
  hasData: boolean;
}

export interface TrendsData {
  days: number;
  trendData: TrendDay[];
  summary: {
    totalScreenTime: string;
    avgDailyScreenTime: string;
    totalShortForm: string;
    avgDailyShortForm: string;
    daysWithData: number;
    dataCoverageText: string;
  };
}

// ==========================================
// VERSION 2 INTERFACES
// ==========================================

export interface SmartInsight {
  id: string;
  category: 'PRODUCTIVITY' | 'SCROLLING' | 'HABIT' | 'GOAL' | 'FOCUS';
  type: 'POSITIVE' | 'WARNING' | 'NEUTRAL';
  title: string;
  description: string;
  evidence: string;
  actionRecommendation?: string;
  impactScore?: number;
}

export interface FocusProfile {
  id: string;
  userId: string;
  name: string;
  durationMinutes: number;
  breakMinutes: number;
  allowedApps: string;
  blockedApps: string;
  icon: string;
  color: string;
  createdAt: string;
  _count?: {
    sessions: number;
  };
}

export interface FocusSession {
  id: string;
  userId: string;
  profileId?: string | null;
  profile?: FocusProfile;
  taskName: string;
  durationMinutes: number;
  completedMinutes: number;
  breakMinutes: number;
  distractionsCount: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'INTERRUPTED' | 'ABANDONED';
  notes?: string;
  startedAt: string;
  endedAt: string;
  createdAt: string;
}

export interface FocusStats {
  totalFocusMinutes: number;
  completedSessionsCount: number;
  totalSessionsAttempted: number;
  cleanRatePercent: number;
  averageMinutesPerSession: number;
  distractionsLogged: number;
}

export interface BlockRule {
  id: string;
  userId: string;
  targetType: 'APP' | 'WEBSITE' | 'CATEGORY';
  targetValue: string;
  mode: 'INSTANT' | 'FOCUS_ONLY' | 'SCHEDULED';
  isEnabled: boolean;
  startTime?: string | null;
  endTime?: string | null;
  isEffectivelyBlocked?: boolean;
  isOverridden?: boolean;
  overrideRemainingMinutes?: number;
  createdAt: string;
  overrides?: BlockOverride[];
}

export interface BlockOverride {
  id: string;
  ruleId: string;
  userId: string;
  reason: string;
  overrideDurationMinutes: number;
  createdAt: string;
  rule?: BlockRule;
}

export interface RoutineSchedule {
  id: string;
  userId: string;
  title: string;
  category: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string;
  parsedDays?: string[];
  isStrict: boolean;
  isEnabled: boolean;
  color: string;
  isCurrentlyActive?: boolean;
  createdAt: string;
}

export interface UserGamification {
  id: string;
  userId: string;
  xp: number;
  level: number;
  dailyStreak: number;
  focusStreak: number;
  longestStreak: number;
  lastActiveDate?: string;
  nextLevelXpCeil: number;
  progressPercent: number;
  achievements?: Achievement[];
}

export interface Achievement {
  id: string;
  userId: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  isUnlocked: boolean;
  unlockedAt?: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'WARNING' | 'LIMIT' | 'FOCUS' | 'ACHIEVEMENT' | 'INFO';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AutomationRule {
  id: string;
  userId: string;
  name: string;
  triggerType: 'SCREEN_TIME_LIMIT' | 'REELS_LIMIT' | 'REEL_COUNT_LIMIT' | 'FOCUS_START';
  conditionOperator: 'GREATER_THAN' | 'EQUALS' | 'CONTAINS';
  thresholdValue: string;
  actionType: 'SHOW_NOTIFICATION' | 'BLOCK_APP' | 'START_FOCUS' | 'WARN';
  actionTarget: string;
  isEnabled: boolean;
  lastTriggeredAt?: string | null;
  createdAt: string;
  logs?: AutomationLog[];
}

export interface AutomationLog {
  id: string;
  ruleId: string;
  userId: string;
  message: string;
  triggeredAt: string;
  rule?: AutomationRule;
}

export interface UserSettings {
  id: string;
  userId: string;
  theme: 'DARK' | 'LIGHT' | 'SYSTEM';
  dashboardLayout: string;
  parsedLayout: string[];
  defaultFocusMinutes: number;
  defaultBreakMinutes: number;
  weekStartDay: string;
  notificationPreferences: string;
  parsedNotifPrefs: Record<string, boolean>;
}

