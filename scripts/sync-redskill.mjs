import fs from "node:fs/promises";
import path from "node:path";
import { root } from "./library.mjs";

const destination = process.env.REDSKILL_DESTINATION
  ? path.resolve(process.env.REDSKILL_DESTINATION)
  : path.join(root, "redskill-submission");
const allowedExtensions = new Set([".md", ".markdown", ".html", ".htm", ".css", ".js", ".json"]);

async function copyFile(source, target, transform = (value) => value) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const content = await fs.readFile(source, "utf8");
  const output = transform(content);
  await fs.writeFile(target, `${output.trimEnd()}\n`);
}

async function copyTextTree(source, target) {
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) await copyTextTree(from, to);
    else if (allowedExtensions.has(path.extname(entry.name).toLowerCase())) await copyFile(from, to);
  }
}

function templateIndex(catalog) {
  const lines = ["# 动效模板目录", "", `${catalog.templates.length} 个可复用动效模板，覆盖数据可视化、透明叠加和知识讲解。`, "", "完整源码：https://github.com/nutllwhy/hyperframes-motion-library", "", "在线演示：https://nutllwhy.github.io/hyperframes-motion-library/", ""];
  for (const category of [...new Set(catalog.templates.map((template) => template.category))]) {
    const templates = catalog.templates.filter((template) => template.category === category);
    lines.push(`## ${category}（${templates.length} 个）`, "");
    for (const template of templates) {
      lines.push(`### ${template.name}`, "", `- ID：\`${template.id}\``, `- 时长：${template.duration}s`, `- 画布：${template.size}`, `- 用途：${template.description}`, `- 标签：${template.tags.join("、")}`, "");
    }
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

async function updateCount(file, count) {
  try {
    const current = await fs.readFile(file, "utf8");
    const next = current
      .replace(/templates\/`：\d+ 个动效模板/g, `templates/\`：${count} 个动效模板`)
      .replace(/\b\d+\s*个可复用的视频动效模板\b/g, `${count} 个可复用的视频动效模板`)
      .replace(/\b\d+个可复用动效模板\b/g, `${count}个可复用动效模板`);
    await fs.writeFile(file, next);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function main() {
  const catalog = JSON.parse(await fs.readFile(path.join(root, "catalog.json"), "utf8"));
  await fs.mkdir(destination, { recursive: true });
  for (const directory of ["app", "scripts", "templates", "references", "examples"]) {
    await fs.rm(path.join(destination, directory), { recursive: true, force: true });
  }

  await copyTextTree(path.join(root, "app"), path.join(destination, "app"));
  await copyTextTree(path.join(root, "templates"), path.join(destination, "templates"));
  await copyTextTree(path.join(root, "references"), path.join(destination, "references"));
  await copyTextTree(path.join(root, "examples"), path.join(destination, "examples"));
  for (const entry of await fs.readdir(path.join(root, "scripts"), { withFileTypes: true })) {
    if (!entry.isFile() || path.extname(entry.name) !== ".mjs" || entry.name === "sync-redskill.mjs") continue;
    const targetName = entry.name.replace(/\.mjs$/, ".js");
    await copyFile(path.join(root, "scripts", entry.name), path.join(destination, "scripts", targetName), (content) => content.replaceAll(".mjs\"", ".js\"").replaceAll(".mjs'", ".js'"));
  }

  for (const [source, target, transform] of [
    ["catalog.json", "catalog.json"],
    ["AGENT_GUIDE.md", "AGENT_GUIDE.md"],
    ["SYSTEM.md", "SYSTEM.md"],
    ["README.md", "README_GITHUB.md", (content) => content.replaceAll("(LICENSE)", "(LICENSE.md)")],
    ["motion-plan.schema.json", "motion-plan.schema.json"],
    ["director-rules.json", "director-rules.json"],
    ["LICENSE", "LICENSE.md"]
  ]) {
    await copyFile(path.join(root, source), path.join(destination, target), transform);
  }

  const rootPackage = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  const redskillPackage = {
    ...rootPackage,
    name: "redskill-hyperframes-motion-library",
    description: "RedSkill-friendly source package for 栗噔噔的视频动效系统",
    scripts: Object.fromEntries(Object.entries(rootPackage.scripts)
      .filter(([name]) => !["sync:redskill", "prepare:release"].includes(name))
      .map(([name, command]) => [name, command.replaceAll(".mjs", ".js")]))
  };
  await fs.writeFile(path.join(destination, "package.json"), `${JSON.stringify(redskillPackage, null, 2)}\n`);
  await fs.writeFile(path.join(destination, "redskill-package.json"), `${JSON.stringify({
    name: "视频动效系统 RedSkill 投稿版",
    author: "栗噔噔",
    license: rootPackage.license,
    repository: "https://github.com/nutllwhy/hyperframes-motion-library",
    demo: "https://nutllwhy.github.io/hyperframes-motion-library/",
    supportedFileTypes: [...allowedExtensions],
    excludedFileTypes: [".mp4", ".webm", ".mov", ".png", ".jpg", ".mjs"],
    templateCount: catalog.templates.length,
    release: catalog.release || rootPackage.version,
    note: "主流分发请引导用户从 GitHub 下载完整项目；本目录用于 RedSkill 读取项目结构、源码和扩展方法。"
  }, null, 2)}\n`);
  await fs.writeFile(path.join(destination, "TEMPLATE_INDEX.md"), templateIndex(catalog));
  for (const file of ["README.md", "SKILL.md"]) await updateCount(path.join(destination, file), catalog.templates.length);
  console.log(`RedSkill 投稿包已同步：${catalog.templates.length} 个模板。`);
}

await main();
