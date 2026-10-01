import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { registerCleanup } from "../../lib/utils/tmp-cleanup.js";

// Spawned as a child process by tmp-cleanup_tests.js to verify that
// registerCleanup removes the directory when the process receives a signal.



const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testem-cleanup-test-'));
registerCleanup(dir);

// Print the path so the parent test can check it after we exit.
process.stdout.write(dir + '\n');

// Keep the process alive until a signal arrives.
setInterval(() => {}, 60000);
