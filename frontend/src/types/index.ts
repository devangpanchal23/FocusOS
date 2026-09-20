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
