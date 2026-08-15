import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { root } from "./library.js";

const generatedRenderPattern = /^(\d{13}-[0-9a-f]{8})(?:-preview)?\.(?:mp4|mov|webm)$/i;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

async function directories(directory) {
  try {
    return (await fs.readdir(directory, { withFileTypes: true })).filter((entry) => entry.isDirectory());
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export async function cleanupGeneratedRenders({
  rendersRoot = path.join(root, "renders"),
  maxJobsPerTemplate = 8,
  maxAgeDays = null,
  dryRun = false
} = {}) {
  const now = Date.now();
  const maxAgeMs = Number.isFinite(maxAgeDays) ? maxAgeDays * 24 * 60 * 60 * 1000 : null;
  let deletedFiles = 0;
  let deletedJobs = 0;
  let bytesFreed = 0;

  for (const templateEntry of await directories(rendersRoot)) {
    const templateDirectory = path.join(rendersRoot, templateEntry.name);
    const files = await fs.readdir(templateDirectory, { withFileTypes: true });
    const groups = new Map();
    for (const entry of files) {
      if (!entry.isFile()) continue;
      const match = entry.name.match(generatedRenderPattern);
      if (!match) continue;
      const filePath = path.join(templateDirectory, entry.name);
      const stat = await fs.stat(filePath);
      const group = groups.get(match[1]) || { id: match[1], timestamp: Number(match[1].slice(0, 13)), files: [], bytes: 0 };
      group.files.push(filePath);
      group.bytes += stat.size;
      groups.set(match[1], group);
    }

    const ordered = [...groups.values()].sort((a, b) => b.timestamp - a.timestamp);
    for (const [index, group] of ordered.entries()) {
      const exceedsLimit = Number.isFinite(maxJobsPerTemplate) && maxJobsPerTemplate >= 0 && index >= maxJobsPerTemplate;
      const exceedsAge = maxAgeMs !== null && now - group.timestamp > maxAgeMs;
      if (!exceedsLimit && !exceedsAge) continue;
      if (!dryRun) await Promise.all(group.files.map((filePath) => fs.rm(filePath, { force: true })));
      deletedFiles += group.files.length;
      deletedJobs += 1;
      bytesFreed += group.bytes;
    }
  }

  return { dryRun, deletedFiles, deletedJobs, bytesFreed, formattedBytes: formatBytes(bytesFreed) };
}

function readNumberFlag(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = Number(process.argv[index + 1]);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} 需要一个非负数字`);
  return value;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const report = await cleanupGeneratedRenders({
    maxJobsPerTemplate: readNumberFlag("--keep") ?? 8,
    maxAgeDays: readNumberFlag("--max-age-days"),
    dryRun: process.argv.includes("--dry-run")
  });
  console.log(`${report.dryRun ? "预计清理" : "已清理"} ${report.deletedJobs} 组、${report.deletedFiles} 个旧渲染，${report.dryRun ? "可释放" : "释放"} ${report.formattedBytes}。`);
}
