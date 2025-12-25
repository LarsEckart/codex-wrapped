<div align="center">

# codex-wrapped

**Your year in code, beautifully visualized.**

<p>
  <strong>Credit:</strong> Built on top of
  <a href="https://github.com/moddi3/opencode-wrapped">opencode-wrapped</a>
  by <a href="https://x.com/moddi3io">moddi3</a> (<a href="https://x.com/moddi3io">@moddi3io</a>).
</p>
<p>
  Found this useful? Follow <a href="https://x.com/nummanali">@nummanali</a> for more AI tooling!
</p>

Generate a personalized "Spotify Wrapped"-style summary of your [Codex](https://openai.com/codex) usage.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?logo=bun&logoColor=white)](https://bun.sh)

<img src="./assets/images/demo-wrapped.png" alt="Codex Wrapped Example" width="600" />

</div>

---

## Installation

### Quick Start

Run directly without installing:

```bash
npx codex-wrapped # or bunx, or yarn/pnpm dlx
```

### Global Install

```bash
npm install -g codex-wrapped # or bun/yarn/pnpm
```

Then run anywhere:

```bash
codex-wrapped
```

## Usage Options

| Option          | Description                          |
| --------------- | ------------------------------------ |
| `--year, -y`    | Generate wrapped for a specific year |
| `--help, -h`    | Show help message                    |
| `--version, -v` | Show version number                  |

## Features

- Sessions, messages, tokens, projects, and streaks
- GitHub-style activity heatmap
- Top models and providers breakdown
- Usage cost (when available)
- Shareable PNG image
- Inline image display (Ghostty, Kitty, iTerm2, WezTerm, Konsole)
- Auto-copy to clipboard

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

## Output

The tool generates:

1. **Terminal Summary** — Quick stats overview in your terminal
2. **PNG Image** — A beautiful, shareable wrapped card saved to your home directory
3. **Clipboard** — Automatically copies the image to your clipboard

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
bun run dev
```

### Production Build

```bash
# Build for all platforms
bun run build
```

### Releasing

Releases are automated via [semantic-release](https://semantic-release.gitbook.io). Merging PRs with [conventional commits](https://www.conventionalcommits.org) to `main` triggers a release.

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
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
