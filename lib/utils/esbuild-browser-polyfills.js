/**
 * Shared esbuild config for bundling Node.js-dependent test code to run in a
 * browser via testem.
 *
 * `esbuild-plugins-node-modules-polyfill` stores the `process`
 * polyfill as a scoped variable inside the IIFE it emits, but CJS module
 * factories (wrapped in `__commonJS`) reference `process`, `__dirname`, and
 * `setImmediate` as free globals — causing ReferenceErrors at runtime.
 *
 * These two options fix that:
 *   - `banner.js`: sets `globalThis.process`, `globalThis.setImmediate`, and
 *     `globalThis.Buffer` before the bundle executes, so CJS factories find
 *     them as globals.
 *   - `define`: replaces `__dirname` / `__filename` literals, which esbuild
 *     does not inject when targeting the browser platform.
 */
import { fileURLToPath } from 'node:url';

const bannerJs = '(function(){' +
  'if(typeof process==="undefined"){' +
    'var p={env:{},browser:true,platform:"browser",' +
      'nextTick:function(fn){Promise.resolve().then(fn);},' +
      'on:function(){},once:function(){},off:function(){},' +
      'emit:function(){},removeListener:function(){},' +
      'removeAllListeners:function(){},addListener:function(){},' +
      'binding:function(){throw new Error("process.binding not supported");},' +
      'cwd:function(){return "/";},' +
      'exit:function(){}' +
    '};' +
    'globalThis.process=p;' +
  '}' +
  'if(typeof setImmediate==="undefined"){' +
    'globalThis.setImmediate=function(fn){Promise.resolve().then(fn);};' +
  '}' +
'})();';

export const banner = { js: bannerJs };
export const bufferInject = fileURLToPath(new URL('./esbuild-buffer-inject.js', import.meta.url));
export const define = {
  __dirname: '""',
  __filename: '""'
};
