import path from "node:path";
import fs from "node:fs";
import addToPATH from "./add-to-PATH.js";

export default function envWithLocalPath(config) {
  let configPath = path.join(config.cwd(), 'node_modules', '.bin');
  let modulesPath;

  if (fs.existsSync(configPath)) {
    modulesPath = configPath;
  } else {
    modulesPath = path.join(process.cwd(), 'node_modules', '.bin');
  }
  return addToPATH(modulesPath);
}
envWithLocalPath.PATH = addToPATH.PATH;