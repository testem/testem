# Changelog

## 4.0.0-beta.1

### Breaking changes

- **Jasmine 1.x removed.** `framework: "jasmine"` is now an alias for modern Jasmine (`jasmine-core` via the `jasmine2` runner). The Jasmine 1 adapter and CDN runner are gone. Specs using `waits`, `waitsFor`, `andReturn`, `HtmlReporter`, or `TrivialReporter` must migrate to modern Jasmine / async patterns.
- **Default `framework` is `jasmine2`.** `"jasmine"` remains supported as an alias.
- **CDN fallback removed.** Built-in `mocha`, `mocha+chai`, `qunit`, and `jasmine` / `jasmine2` runners load only from `/node_modules/` (including routed `/node_modules`). Install `mocha`, `chai`, `qunit`, or `jasmine-core` in your project, or map `"routes": { "/node_modules": "..." }` to an install root.
- **Node 20 dropped.** Supported Node versions are `^22.12.0`, `^24.0.0`, and `>= 26.0.0`.

See [README.md](README.md#migrating-from-testem-3x) for migration steps.

### Changed

- **`rimraf` is no longer a dependency.** Test cleanup and the Istanbul coverage example use Node `fs.rm` / `fs.globSync` instead.
- **Recommended / repo-tested `jasmine-core` is 7.** jasmine-core 5 and 6 remain supported via boot-file detection (`boot0.js`/`boot1.js` vs `boot.js`). Custom `test_page` HTML that hardcodes `boot0.js`/`boot1.js` must switch to `boot.js` when that project upgrades. Load the framework before `/testem.js` (existing required order).

## Earlier releases

See https://github.com/testem/testem/releases
