import { spawnSync } from "node:child_process";
import { readCatalog, root } from "./library.js";
import path from "node:path";

const catalog = await readCatalog();
for (const template of catalog.templates) {
  console.log(`\n检查 ${template.name} (${template.id})`);
  const result = spawnSync("npm", ["run", "check"], { cwd: path.join(root, template.path), stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
