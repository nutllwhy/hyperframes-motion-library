import fs from "node:fs/promises";
import path from "node:path";

export const root = path.resolve(import.meta.dirname, "..");

export async function readCatalog() {
  return JSON.parse(await fs.readFile(path.join(root, "catalog.json"), "utf8"));
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
