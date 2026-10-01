// esbuild inject shim: exposes Buffer as a global for browser bundles.
// The esbuild-plugins-node-modules-polyfill plugin resolves `require('buffer')`
// to a browser polyfill, but does not assign it to globalThis automatically.
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;
