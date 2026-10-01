import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

// Returns a unique temp file path without creating anything on disk,
// matching the behaviour of the former tmp.tmpName() calls.
const tmpNameAsync = () => Promise.resolve(path.join(os.tmpdir(), randomBytes(16).toString('hex')));

export { tmpNameAsync };