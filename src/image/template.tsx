import type { CodexStats, WeekdayActivity } from "../types.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  formatNumberFull,
  formatDate,
  formatDateNoYear,
} from "../utils/format.js";
import { ActivityHeatmap } from "./heatmap.js";
import {
  colors,
  typography,
  spacing,
  layout,
  components,
} from "./design-tokens.js";

const logoBase64Path = fileURLToPath(
  new URL("../../assets/images/codex-logo.base64.txt", import.meta.url)
);
const logoBase64 = readFileSync(logoBase64Path, "utf8").replace(/\s+/g, "");

const CODEX_LOGO_DATA_URL = `data:image/png;base64,${logoBase64}`;
const SHOW_LOGO = process.env.CODEX_WRAPPED_NO_LOGO !== "1";

export function WrappedTemplate({ stats }: { stats: CodexStats }) {
  return (
    <div
      style={{
        width: layout.canvas.width,
        height: layout.canvas.height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: colors.background,
        color: colors.text.primary,
        fontFamily: typography.fontFamily.mono,
        paddingLeft: layout.padding.horizontal,
        paddingRight: layout.padding.horizontal,
        paddingTop: layout.padding.top,
        paddingBottom: layout.padding.bottom,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -220,
          right: -160,
          width: 560,
          height: 560,
          backgroundColor: colors.accent.secondary,
          opacity: 0.18,
          borderRadius: layout.radius.full,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -240,
          left: -160,
          width: 640,
          height: 640,
          backgroundColor: colors.accent.secondary,
          opacity: 0.14,
          borderRadius: layout.radius.full,
        }}
      />
      <Header year={stats.year} />

      <div
        style={{
          marginTop: spacing[8],
          display: "flex",
          flexDirection: "row",
          gap: spacing[6],
          alignItems: "flex-start",
        }}
      >
        <HeroStatItem
          label="Started"
          value={formatDateNoYear(stats.firstSessionDate)}
        />
        <HeroStatItem
          label="Most Active Day"
          value={
            stats.mostActiveDay
              ? `${stats.weekdayActivity.mostActiveDayName}, ${stats.mostActiveDay.formattedDate}`
              : "N/A"
          }
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: colors.surface,
            borderRadius: layout.radius.lg,
            padding: spacing[8],
            border: `1px solid ${colors.surfaceBorder}`,
            flex: 1,
          }}
        >
          <span
            style={{
              fontSize: components.sectionHeader.fontSize,
              fontWeight: components.sectionHeader.fontWeight,
              color: components.sectionHeader.color,
              letterSpacing: components.sectionHeader.letterSpacing,
              textTransform: components.sectionHeader.textTransform,
            }}
          >
            Weekly
          </span>
          <WeeklyBarChart weekdayActivity={stats.weekdayActivity} />
        </div>
      </div>

      <Section title="Activity" marginTop={spacing[8]}>
        <ActivityHeatmap
          dailyActivity={stats.dailyActivity}
          year={stats.year}
          maxStreakDays={stats.maxStreakDays}
        />
      </Section>

      <div
        style={{
          marginTop: spacing[8],
          display: "flex",
          flexDirection: "row",
          gap: spacing[6],
        }}
      >
        <div style={{ flex: 1, display: "flex" }}>
          <RankingList
            title="Top Models"
            items={stats.topModels.map((m) => ({
              name: m.name,
            }))}
            maxItems={5}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: spacing[5],
            flex: 1,
          }}
        >
          <StatBox
            label="Projects"
            value={formatNumberFull(stats.totalProjects)}
          />
          <StatBox
            label="Sessions"
            value={formatNumberFull(stats.totalSessions)}
          />
          <StatBox
            label="Messages"
            value={formatNumberFull(stats.totalMessages)}
          />
          <StatBox
            label="Tokens"
            value={formatNumberFull(stats.totalTokens)}
          />
        </div>
      </div>
    </div>
  );
}

function Header({ year }: { year: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: spacing[2],
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: spacing[8],
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: spacing[4] }}>
          {SHOW_LOGO && (
            <img
              src={CODEX_LOGO_DATA_URL}
              width={72}
              height={72}
              style={{
                objectFit: "contain",
              }}
            />
          )}
          <span
            style={{
              fontSize: typography.size["6xl"],
              fontWeight: typography.weight.bold,
              letterSpacing: typography.letterSpacing.tight,
              color: colors.text.primary,
              lineHeight: typography.lineHeight.none,
            }}
          >
            Codex
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: spacing[2],
            textAlign: "right",
          }}
        >
          <span
            style={{
              fontSize: typography.size["3xl"],
              fontWeight: typography.weight.medium,
              letterSpacing: typography.letterSpacing.normal,
              color: colors.text.primary,
              lineHeight: typography.lineHeight.none,
            }}
          >
            wrapped
          </span>
          <span
            style={{
              fontSize: typography.size["3xl"],
              fontWeight: typography.weight.bold,
              letterSpacing: typography.letterSpacing.normal,
              color: colors.accent.primary,
              lineHeight: typography.lineHeight.none,
            }}
          >
            {year}
          </span>
        </div>
      </div>
    </div>
  );
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Reorder indices from Sun=0 based to Mon=0 based
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const BAR_HEIGHT = 100;
const BAR_MAX_WIDTH = 40;
const BAR_GAP = 8;

const HERO_STAT_CONTENT_HEIGHT = BAR_HEIGHT + spacing[2] + 50;

function HeroStatItem({
  label,
  subtitle,
  value,
}: {
  label: string;
  subtitle?: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        gap: spacing[2],
        backgroundColor: colors.surface,
        borderRadius: layout.radius.lg,
        padding: spacing[8],
        height: HERO_STAT_CONTENT_HEIGHT + spacing[8] * 2,
        border: `1px solid ${colors.surfaceBorder}`,
      }}
    >
      <span
        style={{
          fontSize: components.sectionHeader.fontSize,
          fontWeight: components.sectionHeader.fontWeight,
          color: components.sectionHeader.color,
          letterSpacing: components.sectionHeader.letterSpacing,
          textTransform: components.sectionHeader.textTransform,
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: spacing[2],
          flex: 1,
        }}
      >
        {subtitle && (
          <span
            style={{
              fontSize: typography.size["xl"],
              fontWeight: typography.weight.medium,
              color: colors.text.tertiary,
            }}
          >
            {subtitle}
          </span>
        )}
        <span
          style={{
            fontSize: typography.size["3xl"],
            fontWeight: typography.weight.medium,
            color: colors.text.primary,
            lineHeight: typography.lineHeight.none,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function WeeklyBarChart({
  weekdayActivity,
}: {
  weekdayActivity: WeekdayActivity;
}) {
  const { counts, mostActiveDay, maxCount } = weekdayActivity;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: spacing[2],
        marginTop: spacing[3],
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          gap: BAR_GAP,
          height: BAR_HEIGHT,
        }}
      >
        {WEEKDAY_ORDER.map((dayIndex, i) => {
          const count = counts[dayIndex];
          const heightPercent = maxCount > 0 ? count / maxCount : 0;
          const barHeight = Math.max(8, Math.round(heightPercent * BAR_HEIGHT));
          const isHighlighted = dayIndex === mostActiveDay;

          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: BAR_MAX_WIDTH,
                  height: barHeight,
                  backgroundColor: isHighlighted
                    ? colors.accent.primary
                    : colors.streak.level4,
                  borderRadius: 4,
                }}
              />
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: BAR_GAP,
        }}
      >
        {WEEKDAY_ORDER.map((dayIndex, i) => {
          const isHighlighted = dayIndex === mostActiveDay;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                fontSize: typography.size.sm,
                fontWeight: isHighlighted
                  ? typography.weight.bold
                  : typography.weight.regular,
                color: isHighlighted
                  ? colors.accent.primary
                  : colors.text.muted,
              }}
            >
              {WEEKDAY_LABELS[i]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Section({
  title,
  marginTop = 0,
  children,
}: {
  title: string;
  marginTop?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginTop,
        display: "flex",
        flexDirection: "column",
        gap: spacing[4],
      }}
    >
      <span
        style={{
          fontSize: components.sectionHeader.fontSize,
          fontWeight: components.sectionHeader.fontWeight,
          color: components.sectionHeader.color,
          letterSpacing: components.sectionHeader.letterSpacing,
          textTransform: components.sectionHeader.textTransform,
        }}
      >
        {title}
      </span>
      {children}
    </div>
  );
}

interface RankingItem {
  name: string;
  logoUrl?: string;
}

function RankingList({
  title,
  items,
  maxItems = 3,
}: {
  title: string;
  items: RankingItem[];
  maxItems?: number;
}) {
  const displayItems = items.slice(0, maxItems);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: spacing[5],
        backgroundColor: colors.surface,
        border: `1px solid ${colors.surfaceBorder}`,
        borderRadius: layout.radius.lg,
        padding: spacing[6],
        flex: 1,
      }}
    >
      <span
        style={{
          fontSize: components.sectionHeader.fontSize,
          fontWeight: components.sectionHeader.fontWeight,
          color: components.sectionHeader.color,
          letterSpacing: components.sectionHeader.letterSpacing,
          textTransform: components.sectionHeader.textTransform,
        }}
      >
        {title}
      </span>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: spacing[4],
        }}
      >
        {displayItems.map((item, index) => (
          <RankingItemRow
            key={index}
            rank={index + 1}
            name={item.name}
            logoUrl={item.logoUrl}
          />
        ))}
      </div>
    </div>
  );
}

interface RankingItemRowProps {
  rank: number;
  name: string;
  logoUrl?: string;
}

function RankingItemRow({ rank, name, logoUrl }: RankingItemRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing[4],
      }}
    >
      <span
        style={{
          fontSize: components.ranking.numberSize,
          fontWeight: typography.weight.bold,
          color: colors.text.tertiary,
          width: components.ranking.numberWidth,
          textAlign: "right",
        }}
      >
        {rank}
      </span>

      {logoUrl && (
        <img
          src={logoUrl}
          width={components.ranking.logoSize}
          height={components.ranking.logoSize}
          style={{
            borderRadius: components.ranking.logoBorderRadius,
            background: "#ffffff",
          }}
        />
      )}

      <span
        style={{
          fontSize: components.ranking.itemSize,
          fontWeight: typography.weight.medium,
          color: colors.text.primary,
        }}
      >
        {name}
      </span>
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: string;
}

function StatBox({ label, value }: StatBoxProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        backgroundColor: components.statBox.background,
        paddingTop: spacing[4],
        paddingBottom: spacing[4],
        paddingLeft: spacing[6],
        paddingRight: spacing[6],
        gap: spacing[4],
        flex: 1,
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: components.statBox.borderRadius,
        border: `1px solid ${colors.surfaceBorder}`,
      }}
    >
      <span
        style={{
          fontSize: typography.size.lg,
          fontWeight: typography.weight.medium,
          color: colors.text.tertiary,
          textTransform: "uppercase",
          letterSpacing: typography.letterSpacing.wide,
        }}
      >
        {label}
      </span>

      <span
        style={{
          fontSize: typography.size["2xl"],
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
          lineHeight: typography.lineHeight.none,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Footer() {
  return (
    <div
      style={{
        marginTop: spacing[2],
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: typography.size.lg,
          fontWeight: typography.weight.medium,
          color: colors.text.muted,
          letterSpacing: typography.letterSpacing.normal,
        }}
      >
        openai.com/codex
      </span>
    </div>
  );
}
