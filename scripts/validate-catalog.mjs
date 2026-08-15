import fs from "node:fs/promises";
import path from "node:path";
import { readCatalog, readDirectorRules, readVariableSchema, root, validateVariables } from "./library.mjs";

const catalog = await readCatalog();
const directorRules = await readDirectorRules();
const layoutModes = new Set(Object.keys(directorRules.layoutModes || {}));
if (!layoutModes.size) throw new Error("director-rules.json 缺少 layoutModes");
if (!Array.isArray(directorRules.principles) || !directorRules.principles.length) throw new Error("director-rules.json 缺少导演原则");
const ids = new Set();
let presetCount = 0;
for (const template of catalog.templates) {
  if (ids.has(template.id)) throw new Error(`模板 ID 重复：${template.id}`);
  ids.add(template.id);
  const profile = template.director;
  if (!profile || !layoutModes.has(profile.defaultMode)) throw new Error(`${template.id} 缺少有效的 director.defaultMode`);
  if (!Array.isArray(profile.allowedModes) || !profile.allowedModes.length || !profile.allowedModes.includes(profile.defaultMode)) {
    throw new Error(`${template.id} 的 director.allowedModes 不完整`);
  }
  if (profile.allowedModes.some((mode) => !layoutModes.has(mode))) throw new Error(`${template.id} 使用了未知画面模式`);
  if (!Array.isArray(profile.subjectSelectors) || !profile.subjectSelectors.length || profile.subjectSelectors.some((selector) => typeof selector !== "string" || !selector.trim())) {
    throw new Error(`${template.id} 缺少 director.subjectSelectors`);
  }
  if (!Array.isArray(profile.frameSelectors) || !profile.frameSelectors.length || profile.frameSelectors.some((selector) => typeof selector !== "string" || !selector.trim())) {
    throw new Error(`${template.id} 缺少 director.frameSelectors`);
  }
  if (!["ready", "needs-redesign"].includes(profile.layoutStatus)) throw new Error(`${template.id} 缺少有效的 director.layoutStatus`);
  if (typeof profile.measuredOccupancy !== "number" || profile.measuredOccupancy < 0 || profile.measuredOccupancy > 1) throw new Error(`${template.id} 缺少 director.measuredOccupancy`);
  if (!profile.measuredSpan || typeof profile.measuredSpan.width !== "number" || typeof profile.measuredSpan.height !== "number") throw new Error(`${template.id} 缺少 director.measuredSpan`);
  if (!profile.span || !["minWidth","maxWidth","minHeight","maxHeight"].every((key) => typeof profile.span[key] === "number")) throw new Error(`${template.id} 缺少 director.span`);
  if (profile.subjectSelectors.some((selector) => profile.frameSelectors.includes(selector))) throw new Error(`${template.id} 的真实内容选择器不能与外层框架选择器相同`);
  if ([profile.span.minWidth, profile.span.maxWidth, profile.span.minHeight, profile.span.maxHeight].some((value) => value < 0 || value > 1) || profile.span.minWidth >= profile.span.maxWidth || profile.span.minHeight >= profile.span.maxHeight) {
    throw new Error(`${template.id} 的 director.span 不合法`);
  }
  if (!profile.occupancy || typeof profile.occupancy.min !== "number" || typeof profile.occupancy.max !== "number" || profile.occupancy.min < 0 || profile.occupancy.max > 1 || profile.occupancy.min >= profile.occupancy.max) {
    throw new Error(`${template.id} 的 director.occupancy 不合法`);
  }
  if (typeof profile.guidance !== "string" || !profile.guidance.trim()) throw new Error(`${template.id} 缺少 director.guidance`);
  const directory = path.join(root, template.path);
  for (const required of ["index.html", "design.md", "meta.json", "presets/default.json"]) {
    await fs.access(path.join(directory, required));
  }
  const schema = await readVariableSchema(directory);
  if (!schema.length || schema.some((item) => !item.id || !item.type || item.default === undefined)) {
    throw new Error(`${template.id} 的变量声明不完整`);
  }
  const presetDirectory = path.join(directory, "presets");
  const presetFiles = (await fs.readdir(presetDirectory)).filter((file) => file.endsWith(".json"));
  if (!presetFiles.includes("default.json")) throw new Error(`${template.id} 缺少 default.json`);
  for (const file of presetFiles) {
    const values = JSON.parse(await fs.readFile(path.join(presetDirectory, file), "utf8"));
    validateVariables(schema, values);
    const missing = schema.filter((item) => !item.hidden && !(item.id in values)).map((item) => item.id);
    if (missing.length) throw new Error(`${template.id}/${file} 缺少变量：${missing.join(", ")}`);
    presetCount += 1;
  }
}
console.log(`目录检查通过：${catalog.templates.length} 个模板，${presetCount} 份预设。`);
