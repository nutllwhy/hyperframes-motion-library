import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { readCatalog, root, templateOrientations } from "./library.mjs";
import path from "node:path";

function assertNoLegacyAccent(templateId, label, html) {
  const styleSource = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join("\n");
  const legacyAccent = styleSource.match(/rgba\(255\s*,\s*90\s*,\s*54|(?:background|border(?:-color)?|color)\s*:\s*#(?:ff5a36|ff8a70)|#ffb199/gi);
  if (legacyAccent?.length) {
    console.error(`${templateId}${label} 发现未参数化的橙色强调元素：${[...new Set(legacyAccent)].join(", ")}`);
    process.exit(1);
  }
}

const catalog = await readCatalog();
for (const template of catalog.templates) {
  console.log(`\n检查 ${template.name} (${template.id})`);
  const templateRoot = path.join(root, template.path);
  assertNoLegacyAccent(template.id, "", readFileSync(path.join(templateRoot, "index.html"), "utf8"));
  const result = spawnSync("npm", ["run", "check"], { cwd: templateRoot, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);

  if (templateOrientations(template).includes("portrait")) {
    const portraitRoot = path.join(templateRoot, template.variants?.portrait?.path || "portrait");
    console.log(`  ↳ 竖屏版 ${path.basename(portraitRoot)}/`);
    assertNoLegacyAccent(template.id, "（portrait）", readFileSync(path.join(portraitRoot, "index.html"), "utf8"));
    const portraitResult = spawnSync("npm", ["run", "check"], { cwd: portraitRoot, stdio: "inherit" });
    if (portraitResult.status !== 0) process.exit(portraitResult.status || 1);
  }
}
