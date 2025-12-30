#!/usr/bin/env node

import * as p from "@clack/prompts";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { checkCodexDataExists } from "./collector.js";
import { calculateStats } from "./stats.js";
import { generateDisplayImage, generateFullImage } from "./image/generator.js";
import { displayInTerminal, getTerminalName, shouldSkipInlinePreview } from "./terminal/display.js";
import { formatNumber } from "./utils/format.js";

const VERSION = "1.0.0";
const PROFILE = process.env.CODEX_WRAPPED_PROFILE === "1";

function printHelp() {
  console.log(`
codex-wrapped v${VERSION}

Generate your Codex year in review stats card.

USAGE:
  codex-wrapped [OPTIONS]

OPTIONS:
  --year <YYYY>    Generate wrapped for a specific year (default: current year)
  --no-preview     Skip inline image preview
  --help, -h       Show this help message
  --version, -v    Show version number

EXAMPLES:
  codex-wrapped              # Generate current year wrapped
  codex-wrapped --year 2025  # Generate 2025 wrapped
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

  p.intro("codex wrapped");

  const requestedYear = values.year ? parseInt(values.year, 10) : new Date().getFullYear();
  const skipPreview =
    values.noPreview || process.env.CODEX_WRAPPED_NO_PREVIEW === "1" || shouldSkipInlinePreview();

  const dataExists = await checkCodexDataExists();
  if (!dataExists) {
    p.cancel("Codex data not found in ~/.codex\n\nMake sure you have used Codex at least once.");
    process.exit(0);
  }

  const spinner = p.spinner();
  spinner.start("Scanning your Codex history...");

  let stats;
  try {
    stats = await calculateStats(requestedYear);
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

  const shouldSave = await p.confirm({
    message: `Save image to ~/${filename}?`,
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
      await writeFile(defaultPath, fullImage);
      spinner.stop("Image saved!");
      p.log.success(`Saved to ${defaultPath}`);
    } catch (error) {
      spinner.stop("Failed to save image");
      p.log.error(`Failed to save: ${error}`);
    }
  }

  p.outro("Done!");
  process.exit(0);
}

type ParsedArgs = {
  year?: string;
  help: boolean;
  version: boolean;
  noPreview: boolean;
};

function parseCliArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = { help: false, version: false, noPreview: false };

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

    if (arg === "--year" || arg === "-y") {
      const value = args[i + 1];
      if (!value || value.startsWith("-")) {
        console.error("Error: --year requires a value");
        process.exit(1);
      }
      result.year = value;
      i += 1;
      continue;
    }

    if (arg.startsWith("--year=")) {
      const value = arg.split("=").slice(1).join("=");
      if (!value) {
        console.error("Error: --year requires a value");
        process.exit(1);
      }
      result.year = value;
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
