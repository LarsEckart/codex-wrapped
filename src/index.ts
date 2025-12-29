#!/usr/bin/env bun

import * as p from "@clack/prompts";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { checkCodexDataExists } from "./collector";
import { calculateStats } from "./stats";
import { generateImage } from "./image/generator";
import { displayInTerminal, getTerminalName } from "./terminal/display";
import { formatNumber } from "./utils/format";

const VERSION = "1.0.0";

function printHelp() {
  console.log(`
codex-wrapped v${VERSION}

Generate your Codex year in review stats card.

USAGE:
  codex-wrapped [OPTIONS]

OPTIONS:
  --year <YYYY>    Generate wrapped for a specific year (default: current year)
  --help, -h       Show this help message
  --version, -v    Show version number

EXAMPLES:
  codex-wrapped              # Generate current year wrapped
  codex-wrapped --year 2025  # Generate 2025 wrapped
`);
}

async function main() {
  // Parse command line arguments
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      year: { type: "string", short: "y" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
    strict: true,
    allowPositionals: false,
  });

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
    stats.hasUsageCost && `Usage Cost:    ${stats.totalCost.toFixed(2)}$`,
    stats.mostActiveDay && `Most Active:   ${stats.mostActiveDay.formattedDate}`,
  ].filter(Boolean);

  p.note(summaryLines.join("\n"), `Your ${requestedYear} in Codex`);

  // Generate image
  spinner.start("Generating your wrapped image...");

  let image: { fullSize: Buffer; displaySize: Buffer };
  try {
    image = await generateImage(stats);
  } catch (error) {
    spinner.stop("Failed to generate image");
    p.cancel(`Error generating image: ${error}`);
    process.exit(1);
  }

  spinner.stop("Image generated!");

  const displayed = await displayInTerminal(image.displaySize);
  if (!displayed) {
    p.log.info(`Terminal (${getTerminalName()}) doesn't support inline images`);
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
      await Bun.write(defaultPath, image.fullSize);
      p.log.success(`Saved to ${defaultPath}`);
    } catch (error) {
      p.log.error(`Failed to save: ${error}`);
    }
  }

  p.outro("Done!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
