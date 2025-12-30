import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const entryPath = join(__dirname, "..", "dist", "index.js");

const shebang = "#!/usr/bin/env node\n";
let content = readFileSync(entryPath, "utf8");
if (!content.startsWith("#!")) {
  content = shebang + content;
  writeFileSync(entryPath, content, "utf8");
}

chmodSync(entryPath, 0o755);
