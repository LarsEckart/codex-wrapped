<div align="center">

# codex-wrapped

**Your year in code, beautifully visualized.**

Generate a personalized "Spotify Wrapped"-style summary of your [Codex](https://openai.com/codex) usage.
<img src="./assets/images/demo-wrapped.png" alt="Codex Wrapped Example" width="600" />

</div>

---

## Installation

This repo is meant to be run from source. Please do **not** install the
`codex-wrapped` package from the npm registry (it's a different package).

From the repo root, run:

```bash
npm install && npm start
```

## Usage Options

| Option          | Description                                               |
| --------------- | --------------------------------------------------------- |
| `--yes, -y`     | Auto-accept the save prompt                               |
| `--output, -o`  | Output path for saved image (or pass a single positional path)  |
| `--codex-home`  | Use a custom Codex data directory (defaults to $CODEX_HOME or ~/.codex) |
| `--no-preview`  | Skip inline image preview                                 |
| `--stats`       | Print minimal stats as JSON and exit (no images)          |
| `--stats-full`  | Print full stats as JSON for debugging                    |
| `--help, -h`    | Show help message                                         |
| `--version, -v` | Show version number                                       |

## Features

- Started date + most active day highlights
- Weekly activity bar chart
- Year-long activity heatmap with streak highlights
- Top models list (top 5)
- Totals: projects, sessions, messages, tokens
- Shareable PNG image
- Inline image display (tested in Ghostty)

## Terminal Support

The wrapped image displays natively in terminals that support inline images. As of now, it has only been tested in:

| Terminal                       | Status       |
| ------------------------------ | ------------ |
| [Ghostty](https://ghostty.org) | Tested       |

Other terminals (including the macOS Terminal app) may work but have not been verified.

Windows terminals have not been tested. Inline preview is best-effort and will be skipped when the terminal does not support inline images.
To force a preview attempt, set `CODEX_WRAPPED_FORCE_PREVIEW=1`.

If image rendering fails on your system, you can hide the logo with `CODEX_WRAPPED_NO_LOGO=1`.

## Output

The tool generates:

1. **Terminal Summary** — Quick stats overview in your terminal
2. **PNG Image** — A beautiful, shareable wrapped card you can save to your home directory

## Data Source

Codex Wrapped reads data from your local Codex CLI installation:

```
~/.codex/ (history.jsonl, sessions, logs)
```

You can override the data directory with `--codex-home` or by setting `CODEX_HOME`.

No data is sent anywhere. Everything is processed locally.

## Building

### Development

```bash
# Run in development mode with hot reload
npm run dev
```

### Production Build

```bash
# Build for production
npm run build
```

## Tech Stack

- **Runtime**: Node.js
- **Image Generation**: [Satori](https://github.com/vercel/satori) + [Resvg](https://github.com/nicolo-ribaudo/resvg-js)
- **CLI UI**: [@clack/prompts](https://github.com/natemoo-re/clack)
- **Font**: IBM Plex Mono

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Built for the Codex community

</div>
