<div align="center">

# codex-wrapped

**Your year in code, beautifully visualized.**

Generate a personalized "Spotify Wrapped"-style summary of your [Codex](https://openai.com/codex) usage.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
<img src="./assets/images/demo-wrapped.png" alt="Codex Wrapped Example" width="600" />

</div>

---

## Installation

### Quick Start

Run directly without installing:

```bash
npx codex-wrapped # or yarn/pnpm dlx
```

### Global Install

```bash
npm install -g codex-wrapped # or yarn/pnpm
```

Then run anywhere:

```bash
codex-wrapped
```

## Usage Options

| Option          | Description                                               |
| --------------- | --------------------------------------------------------- |
| `--year`        | Generate wrapped for a specific year                      |
| `--yes, -y`     | Auto-accept the save prompt                               |
| `--output, -o`  | Output path for saved image (or pass a single positional path)  |
| `--no-preview`  | Skip inline image preview                                 |
| `--help, -h`    | Show help message                                         |
| `--version, -v` | Show version number                                       |

## Features

- Sessions, messages, tokens, projects, and streaks
- GitHub-style activity heatmap
- Top models and providers breakdown
- Shareable PNG image
- Inline image display (Ghostty, Kitty, iTerm2, WezTerm, Konsole)

## Terminal Support

The wrapped image displays natively in terminals that support inline images:

| Terminal                                   | Protocol       | Status                      |
| ------------------------------------------ | -------------- | --------------------------- |
| [Ghostty](https://ghostty.org)             | Kitty Graphics | Full support                |
| [Kitty](https://sw.kovidgoyal.net/kitty/)  | Kitty Graphics | Full support                |
| [WezTerm](https://wezfurlong.org/wezterm/) | Kitty + iTerm2 | Full support                |
| [iTerm2](https://iterm2.com)               | iTerm2 Inline  | Full support                |
| [Konsole](https://konsole.kde.org)         | Kitty Graphics | Full support                |
| Other terminals                            | —              | Image saved to file only    |

Cmder/ConEmu runs on Windows and does not support inline images, so the preview is skipped there by default.
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

Built for the Codex community

</div>
