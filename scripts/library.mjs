import fs from "node:fs/promises";
import path from "node:path";

export const root = path.resolve(import.meta.dirname, "..");

export async function readCatalog() {
  return JSON.parse(await fs.readFile(path.join(root, "catalog.json"), "utf8"));
}

export async function readDirectorRules() {
  return JSON.parse(await fs.readFile(path.join(root, "director-rules.json"), "utf8"));
}

export async function readStyleCatalog() {
  return JSON.parse(await fs.readFile(path.join(root, "styles", "catalog.json"), "utf8"));
}

export function requireStyle(styleCatalog, styleId) {
  const id = styleId ?? styleCatalog.defaultStyleId;
  const style = styleCatalog.styles.find((item) => item.id === id);
  if (!style) throw new Error(`未知动效风格：${id}`);
  return style;
}

// Old presets contain their original default colors. Treat those values as inherited
// colors, but keep an explicitly customized color when a style is resolved again.
export async function resolveStyleVariables(schema, values = {}, styleId) {
  validateVariables(schema, values);
  const styleCatalog = await readStyleCatalog();
  const style = requireStyle(styleCatalog, styleId ?? values.styleId);
  if (styleId !== undefined && values.styleId !== undefined && styleId !== values.styleId) {
    throw new Error("styleId 与 variables.styleId 不一致");
  }
  const resolved = { ...Object.fromEntries(schema.map((item) => [item.id, item.default])), ...values };
  if (schema.some((item) => item.id === "styleId")) resolved.styleId = style.id;
  if (style.id !== styleCatalog.defaultStyleId) {
    for (const item of schema) {
      const token = item.id === "bg" ? "background" : item.id;
      if (item.type === "color" && style.tokens[token] && (values[item.id] === undefined || values[item.id].toUpperCase() === String(item.default).toUpperCase())) {
        resolved[item.id] = style.tokens[token];
      }
    }
  }
  validateVariables(schema, resolved);
  return resolved;
}

export function resolveSceneStyleId(styleCatalog, plan, scene, index = 0) {
  const projectStyle = requireStyle(styleCatalog, plan.styleId).id;
  const styleId = requireStyle(styleCatalog, scene.styleId ?? projectStyle).id;
  if (scene.variables?.styleId !== undefined && scene.variables.styleId !== styleId) {
    throw new Error(`第 ${index + 1} 项的 variables.styleId 与方案继承的风格不一致，请使用场景 styleId 显式覆盖`);
  }
  return styleId;
}

export async function getTemplate(templateId) {
  const catalog = await readCatalog();
  const template = catalog.templates.find((item) => item.id === templateId);
  if (!template) throw new Error(`未知模板：${templateId}`);
  return { ...template, absolutePath: path.join(root, template.path) };
}

export async function readVariableSchema(templatePath) {
  const html = await fs.readFile(path.join(templatePath, "index.html"), "utf8");
  const match = html.match(/data-composition-variables='([^']+)'/s);
  if (!match) throw new Error("模板没有声明 data-composition-variables");
  return JSON.parse(match[1]);
}

export function schemaSignature(schema) {
  return JSON.stringify(schema.map((item) => ({ id: item.id, type: item.type, hidden: Boolean(item.hidden) })));
}

export function validateVariables(schema, values) {
  const declarations = new Map(schema.map((item) => [item.id, item]));
  for (const [key, value] of Object.entries(values)) {
    const declaration = declarations.get(key);
    if (!declaration) throw new Error(`未声明的变量：${key}`);
    if (declaration.type === "number" && typeof value !== "number") {
      throw new Error(`${key} 必须是数字`);
    }
    if (["string", "color", "enum"].includes(declaration.type) && typeof value !== "string") {
      throw new Error(`${key} 必须是文本`);
    }
    if (declaration.type === "boolean" && typeof value !== "boolean") {
      throw new Error(`${key} 必须是布尔值`);
    }
    if (declaration.type === "color" && !/^#[0-9a-f]{6}$/i.test(value)) {
      throw new Error(`${key} 必须是六位十六进制颜色`);
    }
    if (declaration.type === "enum" && !declaration.options?.some((option) => option.value === value)) {
      throw new Error(`${key} 不是允许的选项`);
    }
  }
}

export function safeName(value) {
  const name = String(value).trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff_-]+/g, "-");
  if (!name || name.includes("..")) throw new Error("名称无效");
  return name;
}

export const ORIENTATIONS = ["landscape", "portrait"];

export function templateOrientations(template) {
  const declared = Array.isArray(template.orientations) ? template.orientations : ["landscape"];
  return ORIENTATIONS.filter((orientation) => declared.includes(orientation));
}

export function resolveVariants(template) {
  if (template.variants?.landscape && template.variants?.portrait) {
    const variants = { ...template.variants };
    if (!variants.landscape.path) variants.landscape = { ...variants.landscape, path: "" };
    return variants;
  }
  return {
    landscape: {
      path: "",
      width: 1920,
      height: 1080,
      duration: template.duration,
      preview: template.preview,
      director: template.director
    }
  };
}

export function variantPath(template, orientation) {
  if (orientation !== "portrait") return "";
  const variant = template.variants?.portrait;
  if (!variant?.path) throw new Error(`模板 ${template.id} 没有竖屏版本`);
  return variant.path;
}
