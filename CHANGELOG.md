# Changelog

## 4.0.0-beta.1

### Breaking changes

- **Jasmine 1.x removed.** `framework: "jasmine"` is now an alias for modern Jasmine (`jasmine-core` via the `jasmine2` runner). The Jasmine 1 adapter and CDN runner are gone. Specs using `waits`, `waitsFor`, `andReturn`, `HtmlReporter`, or `TrivialReporter` must migrate to modern Jasmine / async patterns.
- **Default `framework` is `jasmine2`.** `"jasmine"` remains supported as an alias.
- **CDN fallback removed.** Built-in `mocha`, `mocha+chai`, `qunit`, and `jasmine` / `jasmine2` runners load only from `/node_modules/` (including routed `/node_modules`). Install `mocha`, `chai`, `qunit`, or `jasmine-core` in your project, or map `"routes": { "/node_modules": "..." }` to an install root.
- **Node 20 dropped.** Supported Node versions are `^22.12.0`, `^24.0.0`, and `>= 26.0.0`.

See [README.md](README.md#migrating-from-testem-3x) for migration steps.

### Changed

- **Interactive TUI now uses [terminal-kit](https://github.com/cronvel/terminal-kit).** Dashboard layout and keyboard shortcuts are unchanged. `p` to pause / unpause file-watch reruns already existed and is now documented. `charm` and `styled_string` are no longer dependencies. This is not a config or CLI break.
- **File watching no longer descends into `node_modules` or `.git` by default.** Scanning those trees opened enough descriptors to exhaust the process (on macOS, later browser or TAP launches then fail with `EBADF`). Include a path under `node_modules` in `src_files` or `watch_files` if you still need reruns from that tree; `.git` stays skipped unless you name it the same way. See [Migrating from Testem 3.x](README.md#migrating-from-testem-3x) for a config example.
- **CI runs a real-PTY dashboard smoke** (`npm run test:tui-e2e`) on Linux, macOS, and Windows. This is not a config or CLI break.

## Earlier releases

See https://github.com/testem/testem/releases
