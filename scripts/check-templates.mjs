import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { readCatalog, root } from "./library.mjs";
import path from "node:path";

const catalog = await readCatalog();
for (const template of catalog.templates) {
  console.log(`\n检查 ${template.name} (${template.id})`);
  const templateRoot = path.join(root, template.path);
  const html = readFileSync(path.join(templateRoot, "index.html"), "utf8");
  const styleSource = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join("\n");
  const legacyAccent = styleSource.match(/rgba\(255\s*,\s*90\s*,\s*54|(?:background|border(?:-color)?|color)\s*:\s*#(?:ff5a36|ff8a70)|#ffb199/gi);
  if (legacyAccent?.length) {
    console.error(`发现未参数化的橙色强调元素：${[...new Set(legacyAccent)].join(", ")}`);
    process.exit(1);
  }
  const result = spawnSync("npm", ["run", "check"], { cwd: templateRoot, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
