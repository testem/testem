# Changelog

## 4.0.0-beta.3

### Changed

- **A missing config file fails the run.** A path passed with `-f` or `file` that does not exist or cannot be parsed exits non-zero (`Config file not found: …`). Running with no config file is unchanged.
- **The default `*.js` set skips the JS config file.** When `src_files` and `serve_files` are unset, the loaded JS config (`testem.js` and the dotted, `.mjs`, and `.cjs` variants) is not part of that set. The built-in runner also skips a script whose `src` is exactly `testem.js`, because `/<id>/testem.js` loads the Testem client a second time. Rename a test file that uses that name.

### Fixed

- **TAP and xunit print failure details.** Object values are serialized instead of `[object Object]`. Results without a duration no longer print `[undefined ms]`. A TAP failure no longer repeats the test name as its message. Output that follows a failed TAP assertion is attached to that failure.
- **Logs written after the last test are reported.** The dev reporter shows them, and the TAP reporter prints them as comments. Custom reporters can implement optional `reportLogs` and `testsPlanned`.
- **`report_file` with a reporter instance no longer reports twice.** Pass a reporter class so the report file gets its own instance. An instance logs a warning and the file is skipped.
- **Chromium and a per-user Opera install are found on Windows.**

## 4.0.0-beta.2

### Added

- **Proxies accept `fallback: true`.** Testem serves its own routes and local files first, and proxies only what those did not answer. See [docs/config_file.md](docs/config_file.md).
- **Middleware receives the HTTP server.** Each function is called as `middleware(app, server)`. A function that only takes `app` still works.
- **`teamcity_nest_by_launcher` groups TeamCity output by launcher.** It is off unless set. Turning it on changes the full test names TeamCity records, so history starts over. Nesting applies only when `parallel` is 1; otherwise the output stays flat.

### Changed

- **QUnit progress shows passed/planned while tests run.** With QUnit 2.2 or later, the dev-mode tab and the browser title use the announced test count until the run finishes. The finished `passed/total` display is unchanged.

### Fixed

- **Files outside `cwd` are no longer served because their path contains the `cwd` string.** With `unsafe_file_serving` off, a request such as `/tmp/app-secret` is not served when `cwd` is `/tmp/app`. `unsafe_file_serving: true` still allows paths outside `cwd`.
- **404 and 500 bodies are `text/plain`.** The 500 body no longer includes `err.message`.

## 4.0.0-beta.1

### Breaking changes

- **Jasmine 1.x removed.** `framework: "jasmine"` is now an alias for modern Jasmine (`jasmine-core` via the `jasmine2` runner). The Jasmine 1 adapter and CDN runner are gone. Specs using `waits`, `waitsFor`, `andReturn`, `HtmlReporter`, or `TrivialReporter` must migrate to modern Jasmine / async patterns.
- **Default `framework` is `jasmine2`.** `"jasmine"` remains supported as an alias.
- **CDN fallback removed.** Built-in `mocha`, `mocha+chai`, `qunit`, and `jasmine` / `jasmine2` runners load only from `/node_modules/` (including routed `/node_modules`). Install `mocha`, `chai`, `qunit`, or `jasmine-core` in your project, or map `"routes": { "/node_modules": "..." }` to an install root.
- **Node 20 dropped.** Supported Node versions are `^22.12.0`, `^24.0.0`, and `>= 26.0.0`.
- **PhantomJS removed.** The built-in `PhantomJS` launcher and config options (`phantomjs_args`, `phantomjs_debug_port`, `phantomjs_launch_script`) are gone. Use **Headless Chrome** or Chrome with `browser_args: { "Chrome": ["--headless"] }` for headless runs.
- **Internet Explorer removed.** The built-in `IE` launcher and IE-specific client compatibility shims are gone. Use Edge (Chromium), Chrome, or Firefox locally. For legacy IE in the cloud, define a custom launcher.
- **Command strings are no longer tokenized.** Custom launcher `command` and string / `{ command }` hooks are passed to the shell unchanged (`shell: true`). Most commands are unaffected. Adjacent quoted runs now follow shell rules (`echo 'a'"b"` prints `ab`, not `a b`), and an unbalanced quote is a shell error instead of being silently dropped. Use `exe` + `args` for argv without a shell.
- **Mustache test pages removed.** `.mustache` `test_page` files are no longer interpolated; leftover `.mustache` files are served as raw text. The `mustache` and `consolidate` dependencies are gone. `Config#getTemplateData` is removed.
- **The package is ESM.** `"type": "module"`. `import Api from 'testem'` and `require('testem')` return the same `Api` class (`lib/api.js` and the `lib/api.cjs` wrapper). Deep imports such as `testem/lib/...` are not exported. The library has no top-level await, so `require('testem')` stays synchronous.
- **JS configs follow their own module format.** Testem's `"type"` does not decide yours. `.cjs` / `.cts` load with `require`. `.js`, `.mjs`, `.mts`, and `.ts` load with `import()`. See `tests/fixtures/cjs_js_config` and `tests/fixtures/esm_js_config`.

See [README.md](README.md#migrating-from-testem-3x) for migration steps.

### Changed

- **`rimraf` is no longer a dependency.** Test cleanup and the Istanbul coverage example use Node `fs.rm` / `fs.globSync` instead.
- **Coverage example uses nyc 18.** `examples/coverage_nyc` instruments and reports with nyc instead of the deprecated `istanbul` 0.4 CLI. The example uses jasmine-core 7 and `boot.js`.
- **Recommended / repo-tested `jasmine-core` is 7.** jasmine-core 5 and 6 remain supported via boot-file detection (`boot0.js`/`boot1.js` vs `boot.js`). Custom `test_page` HTML that hardcodes `boot0.js`/`boot1.js` must switch to `boot.js` when that project upgrades. Load the framework before `/testem.js` (existing required order).
- **`lodash` is no longer a dependency.** Remaining helpers use `Object.assign`, `Array.find`, and a `Set`-based uniq by `src`.
- **Interactive TUI now uses [terminal-kit](https://github.com/cronvel/terminal-kit).** Dashboard layout and keyboard shortcuts are unchanged. `p` to pause / unpause file-watch reruns already existed and is now documented. `charm` and `styled_string` are no longer dependencies. This is not a config or CLI break.
- **File watching no longer descends into `node_modules` or `.git` by default.** Scanning those trees opened enough descriptors to exhaust the process (on macOS, later browser or TAP launches then fail with `EBADF`). Include a path under `node_modules` in `src_files` or `watch_files` if you still need reruns from that tree; `.git` stays skipped unless you name it the same way. See [Migrating from Testem 3.x](README.md#migrating-from-testem-3x) for a config example.
- **CI runs a real-PTY dashboard smoke** (`npm run test:tui-e2e`) on Linux, macOS, and Windows. This is not a config or CLI break.

## Earlier releases

See https://github.com/testem/testem/releases
