import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("codex-wrapped e2e", () => {
  it("prints stats JSON from fixtures", () => {
    const root = process.cwd();
    const cliPath = resolve(root, "dist", "index.js");
    const fixturesPath = resolve(root, "test", "fixtures", ".codex");

    expect(existsSync(cliPath)).toBe(true);
    expect(existsSync(fixturesPath)).toBe(true);

    const result = spawnSync(
      "node",
      [cliPath, "--stats", "--codex-home", fixturesPath],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          CODEX_WRAPPED_NO_PREVIEW: "1",
        },
      }
    );

    expect(result.status, result.stderr).toBe(0);

    const output = result.stdout.trim();
    expect(output.length).toBeGreaterThan(0);

    const stats = JSON.parse(output) as {
      year: number;
      totalSessions: number;
      totalMessages: number;
      totalProjects: number;
      totalInputTokens: number;
      totalCachedInputTokens: number;
      totalOutputTokens: number;
      totalReasoningTokens: number;
      totalTokens: number;
      topModels: Array<{ id: string; count: number }>;
      topProviders: Array<{ id: string; count: number }>;
      dailyActivity: Array<[string, number]>;
      mostActiveDay: { date: string; count: number } | null;
    };

    expect(stats.year).toBe(2025);
    expect(stats.totalSessions).toBe(1);
    expect(stats.totalMessages).toBe(2);
    expect(stats.totalProjects).toBe(1);
    expect(stats.totalInputTokens).toBe(25852);
    expect(stats.totalCachedInputTokens).toBe(24192);
    expect(stats.totalOutputTokens).toBe(65);
    expect(stats.totalReasoningTokens).toBe(0);
    expect(stats.totalTokens).toBe(25917);
    expect(stats.topModels[0]?.id).toBe("gpt-5.2-codex");
    expect(stats.topModels[0]?.count).toBe(25917);
    expect(stats.topProviders[0]?.id).toBe("openai");
    expect(stats.topProviders[0]?.count).toBe(25917);
    expect(stats.dailyActivity).toEqual([["2025-12-31", 2]]);
    expect(stats.mostActiveDay).toMatchObject({
      date: "2025-12-31",
      count: 2,
    });
  });
});
