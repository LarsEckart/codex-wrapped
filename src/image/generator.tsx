import satori from "satori";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
import { WrappedTemplate } from "./template";
import type { CodexStats } from "../types";
import { loadFonts } from "./fonts";
import { layout } from "./design-tokens";

export interface GeneratedImage {
  /** Full resolution PNG buffer for saving/clipboard */
  fullSize: Buffer;
  /** Scaled PNG buffer for terminal display (80% of full size) */
  displaySize: Buffer;
}

const PROFILE = process.env.CODEX_WRAPPED_PROFILE === "1";

async function renderSvg(stats: CodexStats): Promise<string> {
  const t0 = PROFILE ? performance.now() : 0;
  await initWasm(Bun.file(resvgWasm).arrayBuffer());
  if (PROFILE) {
    console.log(`profile: initWasm ${(performance.now() - t0).toFixed(1)}ms`);
  }

  const fontsStart = PROFILE ? performance.now() : 0;
  const fonts = await loadFonts();
  if (PROFILE) {
    console.log(`profile: loadFonts ${(performance.now() - fontsStart).toFixed(1)}ms`);
  }

  const satoriStart = PROFILE ? performance.now() : 0;
  const svg = await satori(<WrappedTemplate stats={stats} />, {
    width: layout.canvas.width,
    height: layout.canvas.height,
    fonts,
  });
  if (PROFILE) {
    console.log(`profile: satori ${(performance.now() - satoriStart).toFixed(1)}ms`);
  }

  return svg;
}

export async function generateDisplayImage(stats: CodexStats): Promise<Buffer> {
  const svg = await renderSvg(stats);
  const displayStart = PROFILE ? performance.now() : 0;
  const displayResvg = new Resvg(svg, {
    fitTo: {
      mode: "zoom",
      value: 0.75,
    },
  });
  const displaySize = Buffer.from(displayResvg.render().asPng());
  if (PROFILE) {
    console.log(`profile: resvg display ${(performance.now() - displayStart).toFixed(1)}ms`);
  }
  return displaySize;
}

export async function generateFullImage(stats: CodexStats): Promise<Buffer> {
  const svg = await renderSvg(stats);
  const fullStart = PROFILE ? performance.now() : 0;
  const fullResvg = new Resvg(svg, {
    fitTo: {
      mode: "zoom",
      value: 1,
    },
  });
  const fullSize = Buffer.from(fullResvg.render().asPng());
  if (PROFILE) {
    console.log(`profile: resvg full ${(performance.now() - fullStart).toFixed(1)}ms`);
  }
  return fullSize;
}

export async function generateImage(stats: CodexStats): Promise<GeneratedImage> {
  const svg = await renderSvg(stats);
  const fullStart = PROFILE ? performance.now() : 0;
  const fullResvg = new Resvg(svg, {
    fitTo: {
      mode: "zoom",
      value: 1,
    },
  });
  const fullSize = Buffer.from(fullResvg.render().asPng());
  if (PROFILE) {
    console.log(`profile: resvg full ${(performance.now() - fullStart).toFixed(1)}ms`);
  }

  const displayStart = PROFILE ? performance.now() : 0;
  const displayResvg = new Resvg(svg, {
    fitTo: {
      mode: "zoom",
      value: 0.75,
    },
  });
  const displaySize = Buffer.from(displayResvg.render().asPng());
  if (PROFILE) {
    console.log(`profile: resvg display ${(performance.now() - displayStart).toFixed(1)}ms`);
  }

  return { fullSize, displaySize };
}
