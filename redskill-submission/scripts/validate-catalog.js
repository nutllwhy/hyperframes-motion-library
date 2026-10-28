import fs from "node:fs/promises";
import path from "node:path";
import { readCatalog, readDirectorRules, readStyleCatalog, readVariableSchema, resolveVariants, root, schemaSignature, templateOrientations, validateVariables } from "./library.js";

const catalog = await readCatalog();
const directorRules = await readDirectorRules();
const styleCatalog = await readStyleCatalog();
if (!Array.isArray(styleCatalog.styles) || !styleCatalog.styles.length) throw new Error("styles/catalog.json 缺少 styles");
const styleIds = styleCatalog.styles.map((style) => style.id);
if (new Set(styleIds).size !== styleIds.length || styleIds.some((id) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))) throw new Error("风格 ID 重复或不合法");
if (!styleIds.includes(styleCatalog.defaultStyleId)) throw new Error("默认风格未在 styles/catalog.json 登记");
for (const style of styleCatalog.styles) {
  if (!style.name || !style.description || !style.motion || !style.tokens) throw new Error(`风格 ${style.id} 缺少名称、说明、运动或视觉定义`);
  for (const token of ["background", "foreground", "muted", "accent"]) {
    if (!/^#[0-9a-f]{6}$/i.test(style.tokens[token] || "")) throw new Error(`风格 ${style.id} 的 ${token} 必须是六位十六进制颜色`);
  }
}
const layoutModes = new Set(Object.keys(directorRules.layoutModes || {}));
if (!layoutModes.size) throw new Error("director-rules.json 缺少 layoutModes");
if (!Array.isArray(directorRules.principles) || !directorRules.principles.length) throw new Error("director-rules.json 缺少导演原则");
const ids = new Set();
let presetCount = 0;
let variantCount = 0;

function validateDirectorProfile(templateId, label, profile) {
  if (!profile || !layoutModes.has(profile.defaultMode)) throw new Error(`${templateId}${label} 缺少有效的 director.defaultMode`);
  if (!Array.isArray(profile.allowedModes) || !profile.allowedModes.length || !profile.allowedModes.includes(profile.defaultMode)) {
    throw new Error(`${templateId}${label} 的 director.allowedModes 不完整`);
  }
  if (profile.allowedModes.some((mode) => !layoutModes.has(mode))) throw new Error(`${templateId}${label} 使用了未知画面模式`);
  if (!Array.isArray(profile.subjectSelectors) || !profile.subjectSelectors.length || profile.subjectSelectors.some((selector) => typeof selector !== "string" || !selector.trim())) {
    throw new Error(`${templateId}${label} 缺少 director.subjectSelectors`);
  }
  if (!Array.isArray(profile.frameSelectors) || !profile.frameSelectors.length || profile.frameSelectors.some((selector) => typeof selector !== "string" || !selector.trim())) {
    throw new Error(`${templateId}${label} 缺少 director.frameSelectors`);
  }
  if (!["ready", "needs-redesign"].includes(profile.layoutStatus)) throw new Error(`${templateId}${label} 缺少有效的 director.layoutStatus`);
  if (typeof profile.measuredOccupancy !== "number" || profile.measuredOccupancy < 0 || profile.measuredOccupancy > 1) throw new Error(`${templateId}${label} 缺少 director.measuredOccupancy`);
  if (!profile.measuredSpan || typeof profile.measuredSpan.width !== "number" || typeof profile.measuredSpan.height !== "number") throw new Error(`${templateId}${label} 缺少 director.measuredSpan`);
  if (!profile.span || !["minWidth","maxWidth","minHeight","maxHeight"].every((key) => typeof profile.span[key] === "number")) throw new Error(`${templateId}${label} 缺少 director.span`);
  if (profile.subjectSelectors.some((selector) => profile.frameSelectors.includes(selector))) throw new Error(`${templateId}${label} 的真实内容选择器不能与外层框架选择器相同`);
  if ([profile.span.minWidth, profile.span.maxWidth, profile.span.minHeight, profile.span.maxHeight].some((value) => value < 0 || value > 1) || profile.span.minWidth >= profile.span.maxWidth || profile.span.minHeight >= profile.span.maxHeight) {
    throw new Error(`${templateId}${label} 的 director.span 不合法`);
  }
  if (!profile.occupancy || typeof profile.occupancy.min !== "number" || typeof profile.occupancy.max !== "number" || profile.occupancy.min < 0 || profile.occupancy.max > 1 || profile.occupancy.min >= profile.occupancy.max) {
    throw new Error(`${templateId}${label} 的 director.occupancy 不合法`);
  }
  if (typeof profile.guidance !== "string" || !profile.guidance.trim()) throw new Error(`${templateId}${label} 缺少 director.guidance`);
}

async function validateCompositionDirectory(templateId, label, directory, expectedSize) {
  await fs.access(path.join(directory, "index.html"));
  const schema = await readVariableSchema(directory);
  if (!schema.length || schema.some((item) => !item.id || !item.type || item.default === undefined)) {
    throw new Error(`${templateId}${label} 的变量声明不完整`);
  }
  const styleVariable = schema.find((item) => item.id === "styleId");
  if (!styleVariable || styleVariable.type !== "enum" || !styleVariable.hidden || styleVariable.default !== styleCatalog.defaultStyleId || JSON.stringify(styleVariable.options?.map((option) => option.value)) !== JSON.stringify(styleIds)) {
    throw new Error(`${templateId}${label} 的 styleId 声明必须与风格目录一致`);
  }
  if (expectedSize) {
    const html = await fs.readFile(path.join(directory, "index.html"), "utf8");
    const width = html.match(/data-width="(\d+)"/)?.[1];
    const height = html.match(/data-height="(\d+)"/)?.[1];
    if (Number(width) !== expectedSize.width || Number(height) !== expectedSize.height) {
      throw new Error(`${templateId}${label} 的合成尺寸是 ${width}×${height}，应为 ${expectedSize.width}×${expectedSize.height}`);
    }
  }
  return schema;
}

for (const template of catalog.templates) {
  if (ids.has(template.id)) throw new Error(`模板 ID 重复：${template.id}`);
  ids.add(template.id);
  const directory = path.join(root, template.path);

  const orientations = templateOrientations(template);
  const variants = resolveVariants(template);
  for (const orientation of orientations) {
    if (!variants[orientation]) throw new Error(`${template.id} 声明了 ${orientation} 但 variants 缺少对应条目`);
  }
  for (const [orientation, variant] of Object.entries(variants)) {
    if (!orientations.includes(orientation)) continue;
    validateDirectorProfile(template.id, `（${orientation}）`, variant.director);
    variantCount += 1;
  }

  const landscapeSchema = await validateCompositionDirectory(template.id, "", directory, null);

  if (orientations.includes("portrait")) {
    const portraitDirectory = path.join(directory, variants.portrait.path || "portrait");
    await fs.access(path.join(portraitDirectory, "package.json"));
    const portraitSchema = await validateCompositionDirectory(template.id, "（portrait）", portraitDirectory, { width: 1080, height: 1920 });
    if (schemaSignature(portraitSchema) !== schemaSignature(landscapeSchema)) {
      throw new Error(`${template.id} 竖屏版的变量声明与横屏版不一致（变量名、类型、hidden 必须逐一相同）`);
    }
  }

  for (const required of ["index.html", "design.md", "meta.json", "presets/default.json"]) {
    await fs.access(path.join(directory, required));
  }
  const presetDirectory = path.join(directory, "presets");
  const presetFiles = (await fs.readdir(presetDirectory)).filter((file) => file.endsWith(".json"));
  if (!presetFiles.includes("default.json")) throw new Error(`${template.id} 缺少 default.json`);
  for (const file of presetFiles) {
    const values = JSON.parse(await fs.readFile(path.join(presetDirectory, file), "utf8"));
    validateVariables(landscapeSchema, values);
    const missing = landscapeSchema.filter((item) => !item.hidden && !(item.id in values)).map((item) => item.id);
    if (missing.length) throw new Error(`${template.id}/${file} 缺少变量：${missing.join(", ")}`);
    presetCount += 1;
  }
}
console.log(`目录检查通过：${catalog.templates.length} 个模板，${variantCount} 个画幅变体，${presetCount} 份预设，${styleIds.length} 套风格。`);
