import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import os from "node:os";
import { getTemplate, readCatalog, readDirectorRules, readVariableSchema, root, safeName, validateVariables } from "./library.mjs";
import { cleanupGeneratedRenders } from "./cleanup-renders.mjs";

const port = Number(process.env.PORT || 4312);
const jobs = new Map();
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime"
};

async function readBody(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

function json(response, status, payload) {
  response.writeHead(status, { "content-type": contentTypes[".json"] });
  response.end(JSON.stringify(payload));
}

async function listPresets(template) {
  const directory = path.join(template.absolutePath, "presets");
  await fs.mkdir(directory, { recursive: true });
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith(".json")).sort((a, b) => {
    if (a === "default.json") return -1;
    if (b === "default.json") return 1;
    return a.localeCompare(b, "zh-CN");
  });
  return Promise.all(files.map(async (file) => ({
    id: file.replace(/\.json$/, ""),
    values: JSON.parse(await fs.readFile(path.join(directory, file), "utf8"))
  })));
}

async function startRender(template, schema, values, quality, requestedFormat, options = {}) {
  const allowedFormats = template.formats || ["mp4"];
  const format = allowedFormats.includes(requestedFormat) ? requestedFormat : (template.defaultFormat || allowedFormats[0]);
  const renderFormat = format === "mov" ? "webm" : format;
  const renderValues = schema.some((item) => item.id === "exportMode")
    ? { ...values, exportMode: format === "mp4" ? "mp4" : "transparent" }
    : values;
  const jobId = randomUUID();
  const projectName = options.project ? safeName(options.project) : null;
  const renderDir = projectName
    ? path.join(root, "renders", "projects", projectName)
    : path.join(root, "renders", template.id);
  await fs.mkdir(renderDir, { recursive: true });
  const baseName = options.outputName ? safeName(options.outputName) : `${Date.now()}-${jobId.slice(0, 8)}`;
  const outputName = `${baseName}.${format}`;
  const outputPath = path.join(renderDir, outputName);
  const previewName = format === "mov" ? `${baseName}-preview.webm` : outputName;
  const previewPath = path.join(renderDir, previewName);
  const publicDirectory = projectName ? `/renders/projects/${projectName}` : `/renders/${template.id}`;
  const outputUrl = `${publicDirectory}/${outputName}`;
  const previewUrl = `${publicDirectory}/${previewName}`;
  const job = { id: jobId, status: "running", phase: "rendering", templateId: template.id, project: projectName, format, output: null, preview: null, log: "" };
  jobs.set(jobId, job);

  const fail = (message, code = 1) => {
    job.status = "failed";
    job.phase = "failed";
    job.code = code;
    if (message) job.log += `\n${message}\n`;
    setTimeout(() => jobs.delete(jobId), 30 * 60 * 1000).unref();
  };

  const complete = () => {
    job.status = "complete";
    job.phase = "complete";
    job.code = 0;
    job.output = outputUrl;
    job.preview = previewUrl;
    setTimeout(() => jobs.delete(jobId), 30 * 60 * 1000).unref();
    cleanupGeneratedRenders({ maxJobsPerTemplate: Number(process.env.RENDER_KEEP_JOBS || 8) }).catch((error) => {
      console.warn(`清理旧渲染失败：${error.message}`);
    });
  };

  const child = spawn("npx", ["--yes", "hyperframes@0.6.115", "render", "--quality", quality, "--format", renderFormat, "--strict-variables", "--variables", JSON.stringify(renderValues), "--output", previewPath], {
    cwd: template.absolutePath,
    env: process.env
  });
  child.stdout.on("data", (chunk) => { job.log += chunk.toString(); });
  child.stderr.on("data", (chunk) => { job.log += chunk.toString(); });
  child.on("error", (error) => fail(`无法启动 HyperFrames：${error.message}`));
  child.on("close", (code) => {
    if (job.status === "failed") return;
    if (code !== 0) return fail("HyperFrames 渲染失败。", code || 1);
    if (format !== "mov") return complete();

    job.phase = "converting";
    job.preview = previewUrl;
    const converter = spawn("ffmpeg", [
      "-hide_banner", "-loglevel", "warning", "-y",
      "-c:v", "libvpx-vp9", "-i", previewPath,
      "-an", "-c:v", "prores_ks", "-profile:v", "4",
      "-pix_fmt", "yuva444p10le", "-vendor", "apl0",
      "-movflags", "+faststart", outputPath
    ], { cwd: template.absolutePath, env: process.env });
    converter.stdout.on("data", (chunk) => { job.log += chunk.toString(); });
    converter.stderr.on("data", (chunk) => { job.log += chunk.toString(); });
    converter.on("error", (error) => fail(`无法启动 FFmpeg：${error.message}`));
    converter.on("close", (convertCode) => {
      if (job.status === "failed") return;
      if (convertCode !== 0) return fail("透明 MOV 转换失败。", convertCode || 1);
      complete();
    });
  });
  return job;
}

async function saveMotionPlan(plan) {
  if (!plan || !["1.0", "1.1"].includes(plan.version) || typeof plan.project !== "string" || !Array.isArray(plan.scenes) || !plan.scenes.length) {
    throw new Error("动效方案缺少 version、project 或 scenes");
  }
  const catalog = await readCatalog();
  const directorRules = await readDirectorRules();
  const layoutModes = new Set(Object.keys(directorRules.layoutModes || {}));
  for (const [index, scene] of plan.scenes.entries()) {
    const template = catalog.templates.find((item) => item.id === scene.templateId && item.status === "ready");
    if (!template) throw new Error(`第 ${index + 1} 项引用了不存在或未就绪的模板`);
    if (plan.version !== "1.1") continue;
    const director = scene.director;
    if (!director || typeof director.sourceQuote !== "string" || !director.sourceQuote.trim()) throw new Error(`第 ${index + 1} 项缺少原始口播`);
    if (typeof director.intent !== "string" || !director.intent.trim()) throw new Error(`第 ${index + 1} 项缺少表达目的`);
    if (!layoutModes.has(director.layoutMode) || !template.director.allowedModes.includes(director.layoutMode)) throw new Error(`第 ${index + 1} 项的画面模式不适合该模板`);
    if (!Array.isArray(director.requiredInformation) || !director.requiredInformation.length) throw new Error(`第 ${index + 1} 项缺少必须信息`);
    if (!Array.isArray(director.forbiddenInformation) || !director.forbiddenInformation.length) throw new Error(`第 ${index + 1} 项缺少禁加信息`);
  }
  const projectName = safeName(plan.project);
  const directory = path.join(root, "renders", "projects", projectName);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "motion-plan.json"), JSON.stringify(plan, null, 2) + "\n");
  return { project: projectName, directory, url: `/renders/projects/${projectName}/motion-plan.json` };
}

function revealDirectory(directory) {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    const command = platform === "darwin" ? "open" : platform === "win32" ? "explorer" : "xdg-open";
    const child = spawn(command, [directory], { detached: true, stdio: "ignore" });
    child.once("error", reject);
    child.once("spawn", () => { child.unref(); resolve(); });
  });
}

async function serveStatic(response, pathname) {
  const relative = pathname === "/" ? "app/index.html" : pathname.replace(/^\//, "");
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root + path.sep)) return false;
  try {
    const stat = await fs.stat(filePath);
    const resolved = stat.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const data = await fs.readFile(resolved);
    response.writeHead(200, { "content-type": contentTypes[path.extname(resolved)] || "application/octet-stream" });
    response.end(data);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (request.method === "GET" && url.pathname === "/api/catalog") {
      const catalog = await readCatalog();
      const directorRules = await readDirectorRules();
      const templates = await Promise.all(catalog.templates.map(async (item) => {
        const template = await getTemplate(item.id);
        return { ...item, schema: await readVariableSchema(template.absolutePath), presets: await listPresets(template) };
      }));
      return json(response, 200, { ...catalog, directorRules, templates });
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
      const job = jobs.get(url.pathname.split("/").pop());
      return job ? json(response, 200, job) : json(response, 404, { error: "任务不存在" });
    }
    if (request.method === "POST" && url.pathname === "/api/render") {
      const body = await readBody(request);
      const template = await getTemplate(body.templateId);
      const schema = await readVariableSchema(template.absolutePath);
      validateVariables(schema, body.variables || {});
      const job = await startRender(template, schema, body.variables || {}, body.quality === "high" ? "high" : "draft", body.format, {
        project: body.project,
        outputName: body.outputName
      });
      return json(response, 202, job);
    }
    if (request.method === "POST" && url.pathname === "/api/plans") {
      const body = await readBody(request);
      const saved = await saveMotionPlan(body.plan);
      return json(response, 201, { project: saved.project, url: saved.url });
    }
    if (request.method === "POST" && url.pathname === "/api/reveal") {
      const body = await readBody(request);
      const projectName = safeName(body.project);
      const directory = path.join(root, "renders", "projects", projectName);
      await fs.mkdir(directory, { recursive: true });
      await revealDirectory(directory);
      return json(response, 200, { project: projectName });
    }
    if (request.method === "POST" && url.pathname === "/api/presets") {
      const body = await readBody(request);
      const template = await getTemplate(body.templateId);
      const schema = await readVariableSchema(template.absolutePath);
      validateVariables(schema, body.values || {});
      const name = safeName(body.name);
      const presetPath = path.join(template.absolutePath, "presets", `${name}.json`);
      await fs.mkdir(path.dirname(presetPath), { recursive: true });
      await fs.writeFile(presetPath, JSON.stringify(body.values, null, 2) + "\n");
      return json(response, 201, { id: name });
    }
    if (await serveStatic(response, url.pathname)) return;
    json(response, 404, { error: "未找到" });
  } catch (error) {
    json(response, 400, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`视频动效系统已启动：http://localhost:${port}`);
  cleanupGeneratedRenders({ maxJobsPerTemplate: Number(process.env.RENDER_KEEP_JOBS || 8) }).then((report) => {
    if (report.deletedFiles) console.log(`已自动清理 ${report.deletedJobs} 组旧渲染，释放 ${report.formattedBytes}.`);
  }).catch((error) => console.warn(`清理旧渲染失败：${error.message}`));
});
