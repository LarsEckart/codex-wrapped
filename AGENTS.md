# AGENTS

## Self-test

Always test (executing tests and test run)  after any changes made.

- Build: `npm run build`
- Test: `npm test`
- Run with auto-save + temp output (positional path): `node dist/index.js -y /tmp/codex-wrapped-test.png`
- Verify output: `ls -lh /tmp/codex-wrapped-test.png`
- Cleanup: `rm /tmp/codex-wrapped-test.png`

## Release/versioning

- Release pipeline triggers on git tags `v*.*.*` and packages `package.json` into the zip.
- Before tagging a release, update `package.json` version and the CLI `VERSION` in `src/index.ts` to match the tag.
