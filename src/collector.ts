// Data collector - reads Codex CLI storage and returns raw data

import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";

const CODEX_DATA_PATH = join(os.homedir(), ".codex");
const CODEX_HISTORY_PATH = join(CODEX_DATA_PATH, "history.jsonl");
const CODEX_SESSIONS_PATH = join(CODEX_DATA_PATH, "sessions");

// Concurrency limit for parallel file processing
const CONCURRENCY_LIMIT = 50;

export interface CodexUsageEvent {
  timestamp: string;
  model: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
}

export interface CodexUsageData {
  events: CodexUsageEvent[];
  dailyActivity: Map<string, number>;
  totalMessages: number;
  totalSessions: number;
  projects: Set<string>;
  earliestSessionDate: Date | null;
}

export async function checkCodexDataExists(): Promise<boolean> {
  try {
    const info = await stat(CODEX_SESSIONS_PATH);
    return info.isDirectory();
  } catch {
    return false;
  }
}

export async function listCodexSessionFiles(year: number): Promise<string[]> {
  const yearPath = join(CODEX_SESSIONS_PATH, String(year));
  const files: string[] = [];

  let monthDirs: Array<string> = [];
  try {
    const entries = await readdir(yearPath, { withFileTypes: true });
    monthDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return files;
  }

  // Parallel processing of months
  const monthPromises = monthDirs.map(async (month) => {
    const monthPath = join(yearPath, month);
    const monthFiles: string[] = [];
    
    let dayDirs: Array<string> = [];
    try {
      const entries = await readdir(monthPath, { withFileTypes: true });
      dayDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return monthFiles;
    }

    // Parallel processing of days within each month
    const dayPromises = dayDirs.map(async (day) => {
      const dayPath = join(monthPath, day);
      const dayFiles: string[] = [];
      try {
        const entries = await readdir(dayPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() && entry.name.endsWith(".jsonl")) {
            dayFiles.push(join(dayPath, entry.name));
          }
        }
      } catch {
        // Ignore unreadable day directories
      }
      return dayFiles;
    });

    const dayResults = await Promise.all(dayPromises);
    return dayResults.flat();
  });

  const monthResults = await Promise.all(monthPromises);
  return monthResults.flat();
}

export async function getCodexFirstPromptTimestamp(): Promise<number | null> {
  try {
    const raw = await readFile(CODEX_HISTORY_PATH, "utf8");
    let minTs: number | null = null;
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as { ts?: number };
        if (!entry.ts) continue;
        if (minTs === null || entry.ts < minTs) {
          minTs = entry.ts;
        }
      } catch {
        // Skip malformed lines
      }
    }
    return minTs;
  } catch {
    return null;
  }
}

// Result from processing a single session file
interface FileProcessResult {
  events: CodexUsageEvent[];
  dailyMessages: Map<string, number>;
  messageCount: number;
  projects: string[];
  earliestDate: Date | null;
}

async function processSessionFile(filePath: string): Promise<FileProcessResult> {
  const events: CodexUsageEvent[] = [];
  const dailyMessages = new Map<string, number>();
  const projects: string[] = [];
  let messageCount = 0;
  let earliestDate: Date | null = null;
  let previousTotals: RawUsage | null = null;
  let currentModel: string | undefined;
  let currentModelIsFallback = false;

  try {
    const content = await readFile(filePath, "utf8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      let entry: any;
      try {
        entry = JSON.parse(trimmed);
      } catch {
        continue;
      }

      const entryType = entry?.type;

      if (entryType === "session_meta") {
        const sessionTimestamp = entry?.payload?.timestamp ?? entry?.timestamp;
        if (sessionTimestamp) {
          const sessionDate = new Date(sessionTimestamp);
          if (!earliestDate || sessionDate < earliestDate) {
            earliestDate = sessionDate;
          }
        }
        const cwd = entry?.payload?.cwd;
        if (cwd) {
          projects.push(cwd);
        }
        continue;
      }

      if (entryType === "turn_context") {
        const model = extractModel(entry?.payload);
        if (model) {
          currentModel = model;
          currentModelIsFallback = false;
        }
        continue;
      }

      if (entryType === "event_msg") {
        const payload = entry?.payload;
        if (payload?.type === "user_message") {
          messageCount += 1;
          const timestamp = entry?.timestamp;
          if (timestamp) {
            const dateKey = formatDateKey(new Date(timestamp));
            dailyMessages.set(dateKey, (dailyMessages.get(dateKey) || 0) + 1);
          }
          continue;
        }

        if (payload?.type !== "token_count") {
          continue;
        }

        const timestamp = entry?.timestamp;
        if (!timestamp) continue;

        const info = payload?.info;
        const lastUsage = normalizeRawUsage(info?.last_token_usage);
        const totalUsage = normalizeRawUsage(info?.total_token_usage);

        let raw = lastUsage;
        if (!raw && totalUsage) {
          raw = subtractRawUsage(totalUsage, previousTotals);
        }

        if (totalUsage) {
          previousTotals = totalUsage;
        }

        if (!raw) continue;

        const delta = convertToDelta(raw);
        if (
          delta.inputTokens === 0 &&
          delta.cachedInputTokens === 0 &&
          delta.outputTokens === 0 &&
          delta.reasoningOutputTokens === 0
        ) {
          continue;
        }

        const extractedModel = extractModel({ ...payload, info });
        if (extractedModel) {
          currentModel = extractedModel;
          currentModelIsFallback = false;
        }

        let model = extractedModel ?? currentModel;
        if (!model) {
          model = LEGACY_FALLBACK_MODEL;
          currentModel = model;
          currentModelIsFallback = true;
        } else if (!extractedModel && currentModelIsFallback) {
          // Still using fallback
        }

        events.push({
          timestamp,
          model,
          inputTokens: delta.inputTokens,
          cachedInputTokens: delta.cachedInputTokens,
          outputTokens: delta.outputTokens,
          reasoningOutputTokens: delta.reasoningOutputTokens,
          totalTokens: delta.totalTokens,
        });
      }
    }
  } catch {
    // Ignore unreadable files
  }

  return { events, dailyMessages, messageCount, projects, earliestDate };
}

// Process files in parallel batches
async function processFilesInParallel(files: string[]): Promise<FileProcessResult[]> {
  const results: FileProcessResult[] = [];
  
  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
    const batch = files.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(batch.map(processSessionFile));
    results.push(...batchResults);
  }
  
  return results;
}

export async function collectCodexUsageData(year: number): Promise<CodexUsageData> {
  const files = await listCodexSessionFiles(year);
  
  // Process all files in parallel
  const fileResults = await processFilesInParallel(files);
  
  // Merge results from all files
  const events: CodexUsageEvent[] = [];
  const dailyActivity = new Map<string, number>();
  const projects = new Set<string>();
  let totalMessages = 0;
  let earliestSessionDate: Date | null = null;

  for (const result of fileResults) {
    // Merge events
    events.push(...result.events);
    
    // Merge daily activity
    for (const [date, count] of result.dailyMessages) {
      dailyActivity.set(date, (dailyActivity.get(date) || 0) + count);
    }
    
    // Merge messages count
    totalMessages += result.messageCount;
    
    // Merge projects
    for (const project of result.projects) {
      projects.add(project);
    }
    
    // Track earliest date
    if (result.earliestDate) {
      if (!earliestSessionDate || result.earliestDate < earliestSessionDate) {
        earliestSessionDate = result.earliestDate;
      }
    }
  }

  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    events,
    dailyActivity,
    totalMessages,
    totalSessions: files.length,
    projects,
    earliestSessionDate,
  };
}

type RawUsage = {
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  reasoning_output_tokens: number;
  total_tokens: number;
};

const LEGACY_FALLBACK_MODEL = "gpt-5";

function ensureNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeRawUsage(value: unknown): RawUsage | null {
  if (value == null || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const input = ensureNumber(record.input_tokens);
  const cached = ensureNumber(record.cached_input_tokens ?? record.cache_read_input_tokens);
  const output = ensureNumber(record.output_tokens);
  const reasoning = ensureNumber(record.reasoning_output_tokens);
  const total = ensureNumber(record.total_tokens);

  return {
    input_tokens: input,
    cached_input_tokens: cached,
    output_tokens: output,
    reasoning_output_tokens: reasoning,
    total_tokens: total > 0 ? total : input + output,
  };
}

function subtractRawUsage(current: RawUsage, previous: RawUsage | null): RawUsage {
  return {
    input_tokens: Math.max(current.input_tokens - (previous?.input_tokens ?? 0), 0),
    cached_input_tokens: Math.max(current.cached_input_tokens - (previous?.cached_input_tokens ?? 0), 0),
    output_tokens: Math.max(current.output_tokens - (previous?.output_tokens ?? 0), 0),
    reasoning_output_tokens: Math.max(current.reasoning_output_tokens - (previous?.reasoning_output_tokens ?? 0), 0),
    total_tokens: Math.max(current.total_tokens - (previous?.total_tokens ?? 0), 0),
  };
}

function convertToDelta(raw: RawUsage): Omit<CodexUsageEvent, "timestamp" | "model"> {
  const total = raw.total_tokens > 0 ? raw.total_tokens : raw.input_tokens + raw.output_tokens;
  const cached = Math.min(raw.cached_input_tokens, raw.input_tokens);
  return {
    inputTokens: raw.input_tokens,
    cachedInputTokens: cached,
    outputTokens: raw.output_tokens,
    reasoningOutputTokens: raw.reasoning_output_tokens,
    totalTokens: total,
  };
}

function extractModel(value: unknown): string | undefined {
  if (value == null || typeof value !== "object") return undefined;
  const payload = value as Record<string, unknown>;

  const info = payload.info;
  if (info && typeof info === "object") {
    const infoRecord = info as Record<string, unknown>;
    const direct = [infoRecord.model, infoRecord.model_name];
    for (const candidate of direct) {
      const model = asNonEmptyString(candidate);
      if (model) return model;
    }
    if (infoRecord.metadata && typeof infoRecord.metadata === "object") {
      const model = asNonEmptyString((infoRecord.metadata as Record<string, unknown>).model);
      if (model) return model;
    }
  }

  const fallbackModel = asNonEmptyString(payload.model);
  if (fallbackModel) return fallbackModel;

  if (payload.metadata && typeof payload.metadata === "object") {
    const model = asNonEmptyString((payload.metadata as Record<string, unknown>).model);
    if (model) return model;
  }

  return undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
