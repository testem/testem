import { PassThrough } from "node:stream";
import termkit from "terminal-kit";

function createTestTerm(width, height) {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const term = termkit.createTerminal({
    stdin: stdin,
    stdout: stdout,
    stderr: stderr,
    generic: 'xterm'
  });
  term.width = width || 80;
  term.height = height || 24;
  return { term, stdin, stdout, stderr };
}

export { createTestTerm };