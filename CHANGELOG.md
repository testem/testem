# Changelog

## 4.0.0-beta.1

### Breaking changes

- **Jasmine 1.x removed.** `framework: "jasmine"` is now an alias for modern Jasmine (`jasmine-core` via the `jasmine2` runner). The Jasmine 1 adapter and CDN runner are gone. Specs using `waits`, `waitsFor`, `andReturn`, `HtmlReporter`, or `TrivialReporter` must migrate to modern Jasmine / async patterns.
- **Default `framework` is `jasmine2`.** `"jasmine"` remains supported as an alias.
- **CDN fallback removed.** Built-in `mocha`, `mocha+chai`, `qunit`, and `jasmine` / `jasmine2` runners load only from `/node_modules/` (including routed `/node_modules`). Install `mocha`, `chai`, `qunit`, or `jasmine-core` in your project, or map `"routes": { "/node_modules": "..." }` to an install root.
- **Node 20 dropped.** Supported Node versions are `^22.12.0`, `^24.0.0`, and `>= 26.0.0`.
- **Command strings are no longer tokenized.** Custom launcher `command` and string / `{ command }` hooks are passed to the shell unchanged (`shell: true`). Most commands are unaffected. Adjacent quoted runs now follow shell rules (`echo 'a'"b"` prints `ab`, not `a b`), and an unbalanced quote is a shell error instead of being silently dropped. Use `exe` + `args` for argv without a shell.

See [README.md](README.md#migrating-from-testem-3x) for migration steps.

## Earlier releases

See https://github.com/testem/testem/releases
