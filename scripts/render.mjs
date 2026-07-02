import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getTemplate, readVariableSchema, root, validateVariables } from "./library.mjs";

const [templateId, presetArg] = process.argv.slice(2);
if (!templateId) throw new Error("用法：npm run render -- <template-id> [preset.json]");
const template = await getTemplate(templateId);
const presetPath = presetArg ? path.resolve(root, presetArg) : path.join(template.absolutePath, "presets/default.json");
const values = JSON.parse(await fs.readFile(presetPath, "utf8"));
validateVariables(await readVariableSchema(template.absolutePath), values);
const outputDir = path.join(root, "renders", templateId);
await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, `${path.basename(presetPath, ".json")}.mp4`);
const result = spawnSync("npx", ["--yes", "hyperframes@0.6.115", "render", "--strict-variables", "--variables", JSON.stringify(values), "--output", output], { cwd: template.absolutePath, stdio: "inherit" });
process.exit(result.status || 0);
