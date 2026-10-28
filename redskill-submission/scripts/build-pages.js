import fs from "node:fs/promises";
import path from "node:path";
import { getTemplate, readCatalog, readDirectorRules, readStyleCatalog, readVariableSchema, resolveVariants, root, templateOrientations } from "./library.js";

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
    for (const orientation of templateOrientations(template)) {
      const variant = resolveVariants(template)[orientation];
      const preview = variant.preview || (orientation === "landscape" ? template.preview : null);
      if (preview && await exists(path.join(root, preview.replace(/^\//, "")))) {
        const previewPath = preview.replace(/^\//, "");
        await copyFile(path.join(root, previewPath), path.join(dist, previewPath));
      }
      const compositionPath = path.join(template.path, variant.path || "", "index.html");
      await copyFile(path.join(root, compositionPath), path.join(dist, compositionPath));
    }
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
  const directorRules = await readDirectorRules();
  const styleCatalog = await readStyleCatalog();
  const templates = await Promise.all(catalog.templates.map(async (item) => {
    const template = await getTemplate(item.id);
    const result = {
      ...item,
      schema: await readVariableSchema(template.absolutePath),
      presets: await listPresets(template)
    };
    if (template.variants?.portrait) result.portraitSchema = await readVariableSchema(path.join(template.absolutePath, template.variants.portrait.path || "portrait"));
    return result;
  }));
  await fs.writeFile(path.join(dist, "catalog.static.json"), JSON.stringify({ ...catalog, directorRules, styleCatalog, templates }, null, 2) + "\n");
}

async function main() {
  await fs.rm(dist, { recursive: true, force: true });
  await fs.mkdir(dist, { recursive: true });
  const catalog = await readCatalog();
  await copyFile(path.join(root, "app", "index.html"), path.join(dist, "index.html"));
  await copyFile(path.join(root, "app", "app.js"), path.join(dist, "app", "app.js"));
  await copyFile(path.join(root, "app", "styles.css"), path.join(dist, "app", "styles.css"));
  await copyFile(path.join(root, "motion-plan.schema.json"), path.join(dist, "motion-plan.schema.json"));
  await copyFile(path.join(root, "director-rules.json"), path.join(dist, "director-rules.json"));
  await copyDirectory(path.join(root, "examples"), path.join(dist, "examples"));
  await copyDirectory(path.join(root, "styles"), path.join(dist, "styles"));
  await copyPreviewSamples(catalog);
  await buildStaticCatalog();
  await fs.writeFile(path.join(dist, ".nojekyll"), "");
  console.log("GitHub Pages 静态演示已构建到 dist/");
}

await main();
