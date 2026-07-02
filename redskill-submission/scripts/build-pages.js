import fs from "node:fs/promises";
import path from "node:path";
import { getTemplate, readCatalog, readVariableSchema, root } from "./library.js";

const dist = path.join(root, "dist");

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyFile(source, target) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}

async function copyDirectory(source, target) {
  if (!(await exists(source))) return;
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(from, to);
    } else {
      await copyFile(from, to);
    }
  }
}

async function copyPreviewSamples(catalog) {
  for (const template of catalog.templates) {
    if (!template.preview) continue;
    const previewPath = template.preview.replace(/^\//, "");
    await copyFile(path.join(root, previewPath), path.join(dist, previewPath));
  }
}

async function listPresets(template) {
  const directory = path.join(template.absolutePath, "presets");
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith(".json")).sort();
  return Promise.all(files.map(async (file) => ({
    id: file.replace(/\.json$/, ""),
    values: JSON.parse(await fs.readFile(path.join(directory, file), "utf8"))
  })));
}

async function buildStaticCatalog() {
  const catalog = await readCatalog();
  const templates = await Promise.all(catalog.templates.map(async (item) => {
    const template = await getTemplate(item.id);
    return {
      ...item,
      schema: await readVariableSchema(template.absolutePath),
      presets: await listPresets(template)
    };
  }));
  await fs.writeFile(path.join(dist, "catalog.static.json"), JSON.stringify({ ...catalog, templates }, null, 2) + "\n");
}

async function main() {
  await fs.rm(dist, { recursive: true, force: true });
  await fs.mkdir(dist, { recursive: true });
  const catalog = await readCatalog();
  await copyFile(path.join(root, "app", "index.html"), path.join(dist, "index.html"));
  await copyFile(path.join(root, "app", "app.js"), path.join(dist, "app", "app.js"));
  await copyFile(path.join(root, "app", "styles.css"), path.join(dist, "app", "styles.css"));
  await copyPreviewSamples(catalog);
  await buildStaticCatalog();
  await fs.writeFile(path.join(dist, ".nojekyll"), "");
  console.log("GitHub Pages 静态演示已构建到 dist/");
}

await main();
