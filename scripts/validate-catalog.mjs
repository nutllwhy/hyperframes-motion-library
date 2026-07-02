import fs from "node:fs/promises";
import path from "node:path";
import { readCatalog, readVariableSchema, root } from "./library.mjs";

const catalog = await readCatalog();
const ids = new Set();
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
}
console.log(`目录检查通过：${catalog.templates.length} 个模板。`);
