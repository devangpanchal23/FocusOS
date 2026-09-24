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
  // V5: multi-condition (AND-chain) automation upgrade — additive, legacy SINGLE rules unaffected.
  conditionLogic?: 'SINGLE' | 'ALL';
  conditions?: AutomationCondition[];
}

// V5: dynamic condition row for Advanced-mode automation rules.
export interface AutomationCondition {
  id?: string;
  triggerType: string;
  conditionOperator: string;
  thresholdValue: string;
  scopeValue?: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  orderIndex?: number;
}

// V5: response shape for POST /api/automation/rules/:id/test and /test-draft
export interface AutomationTestResult {
  wouldTrigger: boolean;
  conditionResults: Array<{
    conditionId?: string;
    actualValue: number | string;
    threshold: number | string;
    passed: boolean;
  }>;
  explanation: string;
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

// ==========================================
// VERSION 3 TYPES — INTELLIGENT ECOSYSTEM
// ==========================================

export interface AiChatMessage {
  id: string;
  sessionId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  metadata?: string | null;
  createdAt: string;
}

export interface AssistantResponse {
  answer: string;
  evidence: string[];
  actionRecommendation?: {
    label: string;
    route: string;
  };
  metricsContext: {
    todayScreenTime: string;
    todayShortForm: string;
    attentionScore: number;
    todayFocusMinutes: number;
  };
}

export interface CoachingProfile {
  id: string;
  userId: string;
  mode: 'STUDY' | 'CODING' | 'DEEP_WORK' | 'WELLNESS' | 'EXAM_PREP' | 'GENERAL';
  targetDailyFocusHours: number;
  tone: 'ENCOURAGING' | 'DIRECT' | 'ANALYTICAL' | 'CHALLENGING';
  lastAdvice?: string;
}

export interface CoachAssessment {
  mode: string;
  targetDailyFocusHours: number;
  tone: string;
  greeting: string;
  currentAssessment: string;
  priorityDirective: string;
  keyStats: {
    todayFocusCompleted: string;
    targetFocusHours: string;
    shortFormCurbed: boolean;
    streakStatus: string;
  };
  recommendedNextStep: {
    title: string;
    description: string;
    actionLabel: string;
    route: string;
  };
}

export interface PredictionSummary {
  projectedScreenTimeMinutes: number;
  projectedScreenTimeFormatted: string;
  confidenceInterval: {
    lowMinutes: number;
    lowFormatted: string;
    highMinutes: number;
    highFormatted: string;
  };
  shortFormRiskPercent: number;
  shortFormRiskLevel: 'LOW' | 'MODERATE' | 'ELEVATED' | 'CRITICAL';
  hourlyVulnerabilityForecast: {
    hour: string;
    riskPercent: number;
    isPeakRisk: boolean;
  }[];
  targetAchievementLikelihood: number;
  activeRiskCount: number;
}

export interface BehavioralRiskLog {
  id: string;
  userId: string;
  riskType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  evidence: string;
  actionRecommendation: string;
  isDismissed: boolean;
  createdAt: string;
}

export interface SmartGoal {
  id: string;
  userId: string;
  title: string;
  goalType: 'SCREEN_TIME_LIMIT' | 'FOCUS_HOURS' | 'STUDY_HOURS' | 'CODING_HOURS' | 'REELS_MAX';
  targetValue: number;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  currentProgress: number;
  progressPercent: number;
  isAchieved: boolean;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  milestones: string;
  parsedMilestones: { label: string; completed: boolean }[];
  createdAt: string;
}

export interface DailyPlanBlock {
  id: string;
  planId: string;
  startTime: string;
  endTime: string;
  taskName: string;
  category: string;
  isCompleted: boolean;
  isFixed: boolean;
}

export interface DailyPlan {
  id: string;
  userId: string;
  date: string;
  summary?: string;
  blocks: DailyPlanBlock[];
}

export interface AccountabilityCircle {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  creatorId: string;
  isCreator: boolean;
  memberCount: number;
  members: {
    id: string;
    name: string;
    email: string;
    joinedAt: string;
  }[];
}

export interface CircleLeaderboardItem {
  userId: string;
  name: string;
  isCurrentUser: boolean;
  weeklyProductiveHours: number;
  attentionScore: number;
  streak: number;
  level: number;
  xp: number;
  rank: number;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string;
  lastUsedAt?: string | null;
  createdAt: string;
  rawKey?: string;
}

export interface WebhookItem {
  id: string;
  userId: string;
  url: string;
  secret: string;
  events: string;
  isEnabled: boolean;
  createdAt: string;
}

export interface PrivacySummary {
  dataInventory: {
    screenshots: number;
    extractions: number;
    dailyMetrics: number;
    focusSessions: number;
    blockRules: number;
  };
  retentionPolicy: {
    rawScreenshotsDays: number;
    ocrAggregatesDays: number;
    anonymizedTraining: boolean;
  };
  encryptionStatus: {
    atRest: string;
    inTransit: string;
    keyOwnership: string;
  };
  auditLogs: PrivacyAuditLogItem[];
}

export interface PrivacyAuditLogItem {
  id: string;
  userId: string;
  action: string;
  details: string;
  createdAt: string;
}


