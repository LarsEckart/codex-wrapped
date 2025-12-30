// Font loader for Satori

import type { Font } from "satori";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const regularFontPath = fileURLToPath(
  new URL("../../assets/fonts/IBMPlexMono-Regular.ttf", import.meta.url)
);
const mediumFontPath = fileURLToPath(
  new URL("../../assets/fonts/IBMPlexMono-Medium.ttf", import.meta.url)
);
const boldFontPath = fileURLToPath(
  new URL("../../assets/fonts/IBMPlexMono-Bold.ttf", import.meta.url)
);

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return Uint8Array.from(buffer).buffer;
}

export async function loadFonts(): Promise<Font[]> {
  const [regularFont, mediumFont, boldFont] = await Promise.all([
    readFile(regularFontPath).then(toArrayBuffer),
    readFile(mediumFontPath).then(toArrayBuffer),
    readFile(boldFontPath).then(toArrayBuffer),
  ]);

  return [
    {
      name: "IBM Plex Mono",
      data: regularFont,
      weight: 400,
      style: "normal",
    },
    {
      name: "IBM Plex Mono",
      data: mediumFont,
      weight: 500,
      style: "normal",
    },
    {
      name: "IBM Plex Mono",
      data: boldFont,
      weight: 700,
      style: "normal",
    },
  ];
}
