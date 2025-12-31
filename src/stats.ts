import type { CodexStats, ModelStats, ProviderStats, WeekdayActivity } from "./types.js";
import { collectCodexUsageData, getCodexFirstPromptTimestamp, type CodexUsageEvent } from "./collector.js";
import { fetchModelsData, getModelDisplayName, getModelProvider, getProviderDisplayName } from "./models.js";

type ModelUsageTotals = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
};

export async function calculateStats(year: number, codexHome?: string): Promise<CodexStats> {
  await fetchModelsData();

  const usageData = await collectCodexUsageData(year, codexHome);
  const dailyActivity = usageData.dailyActivity;
  const weekdayCounts: [number, number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0, 0];

  for (const [date, count] of dailyActivity.entries()) {
    // Parse YYYY-MM-DD as a local date to avoid UTC day-shift
    const weekday = parseDateKey(date).getDay();
    weekdayCounts[weekday] += count;
  }

  const modelUsageTotals = new Map<string, ModelUsageTotals>();

  let totalInputTokens = 0;
  let totalCachedInputTokens = 0;
  let totalOutputTokens = 0;
  let totalReasoningTokens = 0;
  let totalTokens = 0;

  for (const event of usageData.events) {
    const eventTotal = getEventTotal(event);

    totalInputTokens += event.inputTokens;
    totalCachedInputTokens += event.cachedInputTokens;
    totalOutputTokens += event.outputTokens;
    totalReasoningTokens += event.reasoningOutputTokens;
    totalTokens += eventTotal;

    const usage = getOrCreateModelUsage(modelUsageTotals, event.model);
    usage.inputTokens += event.inputTokens;
    usage.cachedInputTokens += event.cachedInputTokens;
    usage.outputTokens += event.outputTokens;
    usage.reasoningTokens += event.reasoningOutputTokens;
    usage.totalTokens += eventTotal;
  }

  const providerCounts = new Map<string, number>();
  const modelStats: ModelStats[] = [];

  for (const [modelId, usage] of modelUsageTotals.entries()) {
    const tokenTotal = usage.totalTokens > 0
      ? usage.totalTokens
      : usage.inputTokens + usage.outputTokens + usage.reasoningTokens;
    if (tokenTotal <= 0) continue;

    const providerId = resolveProviderId(modelId);
    providerCounts.set(providerId, (providerCounts.get(providerId) || 0) + tokenTotal);

    modelStats.push({
      id: modelId,
      name: getModelDisplayName(modelId),
      providerId,
      count: tokenTotal,
      percentage: 0,
    });
  }

  const totalModelTokens = modelStats.reduce((sum, model) => sum + model.count, 0);
  const percentageDenominator = totalTokens > 0 ? totalTokens : totalModelTokens;

  const topModels = modelStats
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((model) => ({
      ...model,
      percentage: percentageDenominator > 0 ? (model.count / percentageDenominator) * 100 : 0,
    }));

  const topProviders: ProviderStats[] = Array.from(providerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => ({
      id,
      name: getProviderDisplayName(id),
      count,
      percentage: percentageDenominator > 0 ? (count / percentageDenominator) * 100 : 0,
    }));

  const { maxStreak, currentStreak, maxStreakDays } = calculateStreaks(dailyActivity, year);
  const mostActiveDay = findMostActiveDay(dailyActivity);
  const weekdayActivity = buildWeekdayActivity(weekdayCounts);

  const historyFirstTs = await getCodexFirstPromptTimestamp(codexHome);
  const historyDate = historyFirstTs ? new Date(historyFirstTs * 1000) : null;
  let firstSessionDate = usageData.earliestSessionDate ?? historyDate ?? new Date();
  const firstActivityDate = findFirstActivityDate(dailyActivity);
  if (firstActivityDate) {
    firstSessionDate = firstActivityDate;
  } else if (historyDate && usageData.earliestSessionDate && historyDate < usageData.earliestSessionDate) {
    firstSessionDate = historyDate;
  }
  const daysSinceFirstSession = Math.floor((Date.now() - firstSessionDate.getTime()) / (1000 * 60 * 60 * 24));
  return {
    year,
    firstSessionDate,
    daysSinceFirstSession,
    totalSessions: usageData.totalSessions,
    totalMessages: usageData.totalMessages,
    totalProjects: usageData.projects.size,
    totalInputTokens,
    totalCachedInputTokens,
    totalOutputTokens,
    totalReasoningTokens,
    totalTokens,
    topModels,
    topProviders,
    maxStreak,
    currentStreak,
    maxStreakDays,
    dailyActivity,
    mostActiveDay,
    weekdayActivity,
  };
}

function findFirstActivityDate(dailyActivity: Map<string, number>): Date | null {
  if (dailyActivity.size === 0) return null;
  const sortedKeys = Array.from(dailyActivity.keys()).sort();
  const firstKey = sortedKeys[0];
  return firstKey ? parseDateKey(firstKey) : null;
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map((value) => Number(value));
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function resolveProviderId(modelId: string): string {
  const provider = getModelProvider(modelId);
  if (provider && provider !== "unknown") return provider;

  if (modelId.startsWith("gpt") || modelId.startsWith("openai")) return "openai";

  return "openai";
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getEventTotal(event: CodexUsageEvent): number {
  const computed = event.inputTokens + event.outputTokens;
  return Math.max(event.totalTokens, computed);
}

function getOrCreateModelUsage(map: Map<string, ModelUsageTotals>, modelId: string): ModelUsageTotals {
  const existing = map.get(modelId);
  if (existing) return existing;
  const fresh = {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
  };
  map.set(modelId, fresh);
  return fresh;
}

function calculateStreaks(
  dailyActivity: Map<string, number>,
  year: number
): { maxStreak: number; currentStreak: number; maxStreakDays: Set<string> } {
  // Get all active dates sorted
  const activeDates = Array.from(dailyActivity.keys())
    .filter((date) => date.startsWith(String(year)))
    .sort();

  if (activeDates.length === 0) {
    return { maxStreak: 0, currentStreak: 0, maxStreakDays: new Set() };
  }

  let maxStreak = 1;
  let tempStreak = 1;
  let tempStreakStart = 0;
  let maxStreakStart = 0;
  let maxStreakEnd = 0;

  for (let i = 1; i < activeDates.length; i++) {
    const prevDate = parseDateKey(activeDates[i - 1]);
    const currDate = parseDateKey(activeDates[i]);

    // Calculate difference in days
    const diffTime = currDate.getTime() - prevDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
        maxStreakStart = tempStreakStart;
        maxStreakEnd = i;
      }
    } else {
      tempStreak = 1;
      tempStreakStart = i;
    }
  }

  // Build the set of max streak days
  const maxStreakDays = new Set<string>();
  for (let i = maxStreakStart; i <= maxStreakEnd; i++) {
    maxStreakDays.add(activeDates[i]);
  }

  // Calculate current streak (from today or yesterday backwards)
  const today = formatDateKey(new Date());
  const yesterday = formatDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const currentStreak = dailyActivity.has(today)
    ? countStreakBackwards(dailyActivity, new Date())
    : dailyActivity.has(yesterday)
    ? countStreakBackwards(dailyActivity, new Date(Date.now() - 24 * 60 * 60 * 1000))
    : 0;

  return { maxStreak, currentStreak, maxStreakDays };
}

/** Count consecutive days with activity going backwards from startDate (inclusive) */
function countStreakBackwards(dailyActivity: Map<string, number>, startDate: Date): number {
  let streak = 1;
  let checkDate = new Date(startDate);

  while (true) {
    checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
    if (dailyActivity.has(formatDateKey(checkDate))) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function findMostActiveDay(dailyActivity: Map<string, number>): { date: string; count: number; formattedDate: string } | null {
  if (dailyActivity.size === 0) {
    return null;
  }

  let maxDate = "";
  let maxCount = 0;

  for (const [date, count] of dailyActivity.entries()) {
    if (count > maxCount) {
      maxCount = count;
      maxDate = date;
    }
  }

  if (!maxDate) {
    return null;
  }

  // Parse date string (YYYY-MM-DD) and format as "Mon D"
  const [year, month, day] = maxDate.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formattedDate = `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}`;

  return {
    date: maxDate,
    count: maxCount,
    formattedDate,
  };
}

function buildWeekdayActivity(counts: [number, number, number, number, number, number, number]): WeekdayActivity {
  const WEEKDAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  let mostActiveDay = 0;
  let maxCount = 0;
  for (let i = 0; i < 7; i++) {
    if (counts[i] > maxCount) {
      maxCount = counts[i];
      mostActiveDay = i;
    }
  }

  return {
    counts,
    mostActiveDay,
    mostActiveDayName: WEEKDAY_NAMES_FULL[mostActiveDay],
    maxCount,
  };
}
