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

export async function generateImage(stats: CodexStats): Promise<GeneratedImage> {
  await initWasm(Bun.file(resvgWasm).arrayBuffer());

  const logoDataUrl = await loadLogoDataUrl([
    "../../assets/images/codex-logo.png",
    "../../assets/images/codex-logo.webp",
    "../../assets/images/codex-logo.svg",
  ]);
  const svg = await satori(<WrappedTemplate stats={stats} logoDataUrl={logoDataUrl} />, {
    width: layout.canvas.width,
    height: layout.canvas.height,
    fonts: await loadFonts(),
  });

  const [fullSize, displaySize] = [1, 0.75].map((v) => {
    const resvg = new Resvg(svg, {
      fitTo: {
        mode: "zoom",
        value: v,
      },
    });
    return Buffer.from(resvg.render().asPng());
  });

  return { fullSize, displaySize };
}

async function loadLogoDataUrl(relativePath: string | string[]): Promise<string | null> {
  const paths = Array.isArray(relativePath) ? relativePath : [relativePath];
  for (const candidate of paths) {
    const file = Bun.file(new URL(candidate, import.meta.url));
    if (!(await file.exists())) {
      continue;
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = candidate.split(".").pop()?.toLowerCase();
    const mime =
      ext === "svg" ? "image/svg+xml" : ext === "webp" ? "image/webp" : "image/png";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  }
  return null;
}
