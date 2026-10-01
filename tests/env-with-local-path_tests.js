import path from "node:path";
import fs from "node:fs";
import { expect } from "chai";
import envWithLocalPath from "../lib/utils/env-with-local-path.js";
import Config from "../lib/config.js";

describe('envWithLocalPath', function() {
  it('returns the process env with the local node module path from the config added if it exists', function() {
    let tempPath = path.join(process.cwd(), 'tmp');
    let binPath = path.join(tempPath, 'node_modules', '.bin');
    fs.mkdirSync(binPath, { recursive: true });
    let config = new Config('ci', {}, {
      cwd: tempPath
    });
    let env = envWithLocalPath(config);
    expect(env[envWithLocalPath.PATH]).to.contain(binPath);
    fs.rmSync(path.join(tempPath, 'node_modules'), { recursive: true, force: true });
  });

  it('returns the process env with the local node module path added', function() {
    let config = new Config('ci', {}, {});
    let env = envWithLocalPath(config);
    expect(env[envWithLocalPath.PATH]).to.contain(
      path.join(process.cwd(), 'node_modules', '.bin')
    );
  });

  it('does not modify process.env', function() {
    let config = new Config('ci', {}, {});
    envWithLocalPath(config);
    expect(process.env[envWithLocalPath.PATH]).not.to.contain(
      path.join(process.cwd(), 'node_modules', '.bin')
    );
  });
});
