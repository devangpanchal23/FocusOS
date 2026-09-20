/**
 * Parses diverse duration strings into total integer minutes.
 * Handles formats like:
 * - "6h 08m", "6h 8m", "1h 31m"
 * - "21m", "45 min", "12 mins"
 * - "2h", "3 hr"
 * - "06:08" (hh:mm)
 * - "18 sec", "45s" (returns 0 or 1 min)
 */
export function parseDurationToMinutes(input: string | number): number {
  if (typeof input === 'number') return Math.max(0, Math.round(input));
  if (!input || typeof input !== 'string') return 0;

  const text = input.trim().toLowerCase();

  // Pattern: "6h 08m" or "6h8m" or "1h 31m"
  const hmMatch = text.match(/(\d+)\s*h(?:ours?|r)?(?:\s*(\d+)\s*m(?:in(?:ute)?s?)?)?/i);
  if (hmMatch) {
    const hours = parseInt(hmMatch[1], 10) || 0;
    const minutes = parseInt(hmMatch[2] || '0', 10) || 0;
    return hours * 60 + minutes;
  }

  // Pattern: "45m" or "21 mins"
  const mMatch = text.match(/^(\d+)\s*m(?:in(?:ute)?s?)?$/i);
  if (mMatch) {
    return parseInt(mMatch[1], 10) || 0;
  }

  // Pattern: "2h" or "3 hrs"
  const hMatch = text.match(/^(\d+)\s*h(?:ours?|r)?$/i);
  if (hMatch) {
    return (parseInt(hMatch[1], 10) || 0) * 60;
  }

  // Pattern: "06:08" or "1:31"
  const colonMatch = text.match(/^(\d+):(\d{2})$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10) || 0;
    const minutes = parseInt(colonMatch[2], 10) || 0;
    return hours * 60 + minutes;
  }

  // Fallback: parse raw number
  const num = parseInt(text, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Formats total minutes into human-readable string like "6h 08m" or "21m".
 */
export function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m < 10 ? '0' : ''}${m}m`;
}

export interface AttentionScoreBreakdown {
  score: number;
  factors: {
    label: string;
    points: number;
    description: string;
    type: 'positive' | 'negative' | 'neutral';
  }[];
}

/**
 * Calculates Attention Score (0-100) with transparent evidence factors
 */
export function calculateAttentionScore(params: {
  totalScreenTimeMinutes: number;
  productiveMinutes: number;
  shortFormMinutes: number;
  dailyTargetMinutes?: number;
  unlocks?: number;
  notifications?: number;
}): AttentionScoreBreakdown {
  let score = 50; // Neutral base
  const factors: AttentionScoreBreakdown['factors'] = [];

  // 1. Focus / Productive work
  const focusPoints = Math.min(25, Math.round((params.productiveMinutes / 60) * 8));
  if (focusPoints > 0) {
    score += focusPoints;
    factors.push({
      label: 'Focused Work',
      points: focusPoints,
      description: `${formatMinutes(params.productiveMinutes)} dedicated to productive/dev tasks`,
      type: 'positive',
    });
  }

  // 2. Target Adherence
  const target = params.dailyTargetMinutes || 240;
  if (params.totalScreenTimeMinutes > 0 && params.totalScreenTimeMinutes <= target) {
    score += 15;
    factors.push({
      label: 'Target Adherence',
      points: 15,
      description: `Screen time stayed below daily target (${formatMinutes(target)})`,
      type: 'positive',
    });
  } else if (params.totalScreenTimeMinutes > target + 120) {
    const penalty = Math.min(15, Math.round((params.totalScreenTimeMinutes - target) / 30));
    score -= penalty;
    factors.push({
      label: 'Over Screen Limit',
      points: -penalty,
      description: `Exceeded target by ${formatMinutes(params.totalScreenTimeMinutes - target)}`,
      type: 'negative',
    });
  }

  // 3. Short-Form Video Penalty
  if (params.shortFormMinutes > 30) {
    const excess = params.shortFormMinutes - 30;
    const reelsPenalty = Math.min(25, Math.round((excess / 15) * 2));
    score -= reelsPenalty;
    factors.push({
      label: 'Excessive Reels/Shorts',
      points: -reelsPenalty,
      description: `${formatMinutes(params.shortFormMinutes)} lost to short-form algorithms`,
      type: 'negative',
    });
  }

  // 4. Device Unlocks & Fragmented Attention
  if (params.unlocks && params.unlocks > 70) {
    const unlockPenalty = Math.min(10, Math.round((params.unlocks - 70) / 5));
    score -= unlockPenalty;
    factors.push({
      label: 'Frequent Checking',
      points: -unlockPenalty,
      description: `${params.unlocks} phone unlocks indicating attention fragmentation`,
      type: 'negative',
    });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, factors };
}

/**
 * Translates short-form scrolling minutes into equivalent opportunity cost
 */
export function calculateScrollCost(shortFormMinutes: number) {
  const hours = +(shortFormMinutes / 60).toFixed(1);
  const codingSessions = +(shortFormMinutes / 90).toFixed(1);
  const booksCompleted = +(shortFormMinutes / 360).toFixed(2); // ~6 hours to read a 250-page book
  const walkingKilometers = +(shortFormMinutes * 0.08).toFixed(1); // ~5 km/hr walking

  return {
    minutes: shortFormMinutes,
    formatted: formatMinutes(shortFormMinutes),
    hours,
    equivalents: [
      { label: 'Deep Learning', value: `${hours} hours`, icon: 'BookOpen' },
      { label: 'Coding Sessions', value: `~${codingSessions} sessions (90m)`, icon: 'Code' },
      { label: 'Books Read', value: `${booksCompleted} books`, icon: 'FileText' },
      { label: 'Walking Distance', value: `~${walkingKilometers} km`, icon: 'Footprints' },
    ],
  };
}
