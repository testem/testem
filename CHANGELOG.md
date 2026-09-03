# Changelog

## 4.0.0-beta.1

### Breaking changes

- **Jasmine 1.x removed.** `framework: "jasmine"` is now an alias for modern Jasmine (`jasmine-core` via the `jasmine2` runner). The Jasmine 1 adapter and CDN runner are gone. Specs using `waits`, `waitsFor`, `andReturn`, `HtmlReporter`, or `TrivialReporter` must migrate to modern Jasmine / async patterns.
- **Default `framework` is `jasmine2`.** `"jasmine"` remains supported as an alias.
- **CDN fallback removed.** Built-in `mocha`, `mocha+chai`, `qunit`, and `jasmine` / `jasmine2` runners load only from `/node_modules/` (including routed `/node_modules`). Install `mocha`, `chai`, `qunit`, or `jasmine-core` in your project, or map `"routes": { "/node_modules": "..." }` to an install root.
- **Node 20 dropped.** Supported Node versions are `^22.12.0`, `^24.0.0`, and `>= 26.0.0`.

See [README.md](README.md#migrating-from-testem-3x) for migration steps.

## Earlier releases

See https://github.com/testem/testem/releases
