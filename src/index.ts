#!/usr/bin/env node

import * as p from "@clack/prompts";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { checkCodexDataExists, resolveCodexHome } from "./collector.js";
import { calculateStats } from "./stats.js";
import { generateDisplayImage, generateFullImage } from "./image/generator.js";
import { displayInTerminal, getTerminalName, shouldSkipInlinePreview } from "./terminal/display.js";
import { formatNumber } from "./utils/format.js";
import type { CodexStats } from "./types.js";

const VERSION = "1.0.0";
const FIXED_YEAR = 2025;
const PROFILE = process.env.CODEX_WRAPPED_PROFILE === "1";

function printHelp() {
  console.log(`
codex-wrapped v${VERSION}

Generate your Codex year in review stats card.

USAGE:
  codex-wrapped [OPTIONS]

OPTIONS:
  --yes, -y        Auto-accept the save prompt
  --output, -o     Output path for saved image (or pass a single positional path)
  --codex-home     Use a custom Codex data directory (defaults to $CODEX_HOME or ~/.codex)
  --no-preview     Skip inline image preview
  --stats          Print stats as JSON and exit (no images)
  --help, -h       Show this help message
  --version, -v    Show version number

EXAMPLES:
  codex-wrapped              # Generate 2025 wrapped
  codex-wrapped -y /tmp/codex-wrapped.png  # Auto-save to a specific path
  codex-wrapped --stats      # Print stats as JSON and exit
`);
}

async function main() {
  // Parse command line arguments
  const values = parseCliArgs(process.argv.slice(2));

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  if (values.version) {
    console.log(`codex-wrapped v${VERSION}`);
    process.exit(0);
  }

  const requestedYear = FIXED_YEAR;
  const codexHome = resolveCodexHome(values.codexHome);

  if (values.statsOnly) {
    const dataExists = await checkCodexDataExists(codexHome);
    if (!dataExists) {
      console.error(`Codex data not found in ${codexHome}`);
      process.exit(1);
    }

    let stats: CodexStats;
    try {
      stats = await calculateStats(requestedYear, codexHome);
    } catch (error) {
      console.error(`Failed to collect stats: ${error}`);
      process.exit(1);
    }

    if (stats.totalSessions === 0) {
      console.error(`No Codex activity found for ${requestedYear}`);
      process.exit(1);
    }

    console.log(JSON.stringify(serializeStats(stats), null, 2));
    process.exit(0);
  }

  p.intro("codex wrapped");

  const skipPreview =
    values.noPreview || process.env.CODEX_WRAPPED_NO_PREVIEW === "1" || shouldSkipInlinePreview();

  const dataExists = await checkCodexDataExists(codexHome);
  if (!dataExists) {
    p.cancel(
      `Codex data not found in ${codexHome}\n\nMake sure you have used Codex at least once.`
    );
    process.exit(0);
  }

  const spinner = p.spinner();
  spinner.start("Scanning your Codex history...");

  let stats;
  try {
    stats = await calculateStats(requestedYear, codexHome);
  } catch (error) {
    spinner.stop("Failed to collect stats");
    p.cancel(`Error: ${error}`);
    process.exit(1);
  }

  if (stats.totalSessions === 0) {
    spinner.stop("No data found");
    p.cancel(`No Codex activity found for ${requestedYear}`);
    process.exit(0);
  }

  spinner.stop("Found your stats!");

  // Display summary
  const summaryLines = [
    `Sessions:      ${formatNumber(stats.totalSessions)}`,
    `Messages:      ${formatNumber(stats.totalMessages)}`,
    `Total Tokens:  ${formatNumber(stats.totalTokens)}`,
    stats.totalCachedInputTokens > 0 && `Cache Read:   ${formatNumber(stats.totalCachedInputTokens)}`,
    stats.totalReasoningTokens > 0 && `Reasoning:     ${formatNumber(stats.totalReasoningTokens)}`,
    `Projects:      ${formatNumber(stats.totalProjects)}`,
    `Streak:        ${stats.maxStreak} days`,
    stats.mostActiveDay && `Most Active:   ${stats.mostActiveDay.formattedDate}`,
  ].filter(Boolean);

  p.note(summaryLines.join("\n"), `Your ${requestedYear} in Codex`);

  if (!skipPreview) {
    // Generate display image first (faster feedback)
    spinner.start("Generating your wrapped preview...");

    let displayImage: Buffer;
    try {
      const genStart = PROFILE ? performance.now() : 0;
      displayImage = await generateDisplayImage(stats);
      if (PROFILE) {
        const genMs = performance.now() - genStart;
        console.log(`profile: generateDisplayImage ${genMs.toFixed(1)}ms`);
      }
    } catch (error) {
      spinner.stop("Failed to generate preview");
      p.cancel(`Error generating image: ${error}`);
      process.exit(1);
    }

    spinner.stop("Preview generated!");

    const displayStart = PROFILE ? performance.now() : 0;
    const displayed = await displayInTerminal(displayImage);
    if (PROFILE) {
      const displayMs = performance.now() - displayStart;
      console.log(`profile: displayInTerminal ${displayMs.toFixed(1)}ms`);
    }
    if (!displayed) {
      p.log.info(`Terminal (${getTerminalName()}) doesn't support inline images`);
    }
  } else {
    p.log.info("Skipping inline preview");
  }

  const filename = `codex-wrapped-${requestedYear}.png`;
  const defaultPath = join(process.env.HOME || "~", filename);

  const targetPath = values.outputPath ?? defaultPath;
  const shouldAutoSave = values.autoSave;
  const shouldSave = shouldAutoSave
    ? true
    : await p.confirm({
        message:
          values.outputPath && values.outputPath !== defaultPath
            ? `Save image to ${targetPath}?`
            : `Save image to ~/${filename}?`,
        initialValue: true,
      });

  if (p.isCancel(shouldSave)) {
    p.outro("Cancelled");
    process.exit(0);
  }

  if (shouldSave) {
    try {
      spinner.start("Generating full-size image...");
      const fullStart = PROFILE ? performance.now() : 0;
      const fullImage = await generateFullImage(stats);
      if (PROFILE) {
        const fullMs = performance.now() - fullStart;
        console.log(`profile: generateFullImage ${fullMs.toFixed(1)}ms`);
      }
      await writeFile(targetPath, fullImage);
      spinner.stop("Image saved!");
      p.log.success(`Saved to ${targetPath}`);
    } catch (error) {
      spinner.stop("Failed to save image");
      p.log.error(`Failed to save: ${error}`);
    }
  }

  p.outro("Done!");
  process.exit(0);
}

type ParsedArgs = {
  help: boolean;
  version: boolean;
  noPreview: boolean;
  autoSave: boolean;
  outputPath?: string;
  codexHome?: string;
  statsOnly: boolean;
};

type SerializedStats = {
  year: number;
  firstSessionDate: string;
  daysSinceFirstSession: number;
  totalSessions: number;
  totalMessages: number;
  totalProjects: number;
  totalInputTokens: number;
  totalCachedInputTokens: number;
  totalOutputTokens: number;
  totalReasoningTokens: number;
  totalTokens: number;
  topModels: CodexStats["topModels"];
  topProviders: CodexStats["topProviders"];
  maxStreak: number;
  currentStreak: number;
  maxStreakDays: string[];
  dailyActivity: Array<[string, number]>;
  mostActiveDay: CodexStats["mostActiveDay"];
  weekdayActivity: CodexStats["weekdayActivity"];
};

function serializeStats(stats: CodexStats): SerializedStats {
  const dailyActivity = Array.from(stats.dailyActivity.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const maxStreakDays = Array.from(stats.maxStreakDays).sort();

  return {
    year: stats.year,
    firstSessionDate: stats.firstSessionDate.toISOString(),
    daysSinceFirstSession: stats.daysSinceFirstSession,
    totalSessions: stats.totalSessions,
    totalMessages: stats.totalMessages,
    totalProjects: stats.totalProjects,
    totalInputTokens: stats.totalInputTokens,
    totalCachedInputTokens: stats.totalCachedInputTokens,
    totalOutputTokens: stats.totalOutputTokens,
    totalReasoningTokens: stats.totalReasoningTokens,
    totalTokens: stats.totalTokens,
    topModels: stats.topModels,
    topProviders: stats.topProviders,
    maxStreak: stats.maxStreak,
    currentStreak: stats.currentStreak,
    maxStreakDays,
    dailyActivity,
    mostActiveDay: stats.mostActiveDay,
    weekdayActivity: stats.weekdayActivity,
  };
}

function parseCliArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    help: false,
    version: false,
    noPreview: false,
    autoSave: false,
    statsOnly: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      result.help = true;
      continue;
    }

    if (arg === "--version" || arg === "-v") {
      result.version = true;
      continue;
    }

    if (arg === "--no-preview") {
      result.noPreview = true;
      continue;
    }

    if (arg === "--yes" || arg === "-y") {
      result.autoSave = true;
      continue;
    }

    if (arg === "--output" || arg === "-o") {
      const value = args[i + 1];
      if (!value || value.startsWith("-")) {
        console.error("Error: --output requires a value");
        process.exit(1);
      }
      result.outputPath = value;
      i += 1;
      continue;
    }

    if (arg === "--codex-home") {
      const value = args[i + 1];
      if (!value || value.startsWith("-")) {
        console.error("Error: --codex-home requires a value");
        process.exit(1);
      }
      result.codexHome = value;
      i += 1;
      continue;
    }

    if (arg === "--stats" || arg === "--print-stats") {
      result.statsOnly = true;
      continue;
    }

    if (!arg.startsWith("-")) {
      if (result.outputPath) {
        console.error("Error: Only one output path may be provided");
        process.exit(1);
      }
      result.outputPath = arg;
      continue;
    }

    console.error(`Error: Unknown option "${arg}"`);
    process.exit(1);
  }

  return result;
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
