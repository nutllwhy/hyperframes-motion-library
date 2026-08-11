import fs from "node:fs/promises";
import path from "node:path";
import { readCatalog, readVariableSchema, root, validateVariables } from "./library.mjs";

const catalog = await readCatalog();
const ids = new Set();
let presetCount = 0;
for (const template of catalog.templates) {
  if (ids.has(template.id)) throw new Error(`模板 ID 重复：${template.id}`);
  ids.add(template.id);
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
