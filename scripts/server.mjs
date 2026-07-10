import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { getTemplate, readCatalog, readVariableSchema, root, safeName, validateVariables } from "./library.mjs";

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
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith(".json"));
  return Promise.all(files.map(async (file) => ({
    id: file.replace(/\.json$/, ""),
    values: JSON.parse(await fs.readFile(path.join(directory, file), "utf8"))
  })));
}

async function startRender(template, schema, values, quality, requestedFormat) {
  const allowedFormats = template.formats || ["mp4"];
  const format = allowedFormats.includes(requestedFormat) ? requestedFormat : (template.defaultFormat || allowedFormats[0]);
  const renderFormat = format === "mov" ? "webm" : format;
  const renderValues = schema.some((item) => item.id === "exportMode")
    ? { ...values, exportMode: format === "mp4" ? "mp4" : "transparent" }
    : values;
  const jobId = randomUUID();
  const renderDir = path.join(root, "renders", template.id);
  await fs.mkdir(renderDir, { recursive: true });
  const baseName = `${Date.now()}-${jobId.slice(0, 8)}`;
  const outputName = `${baseName}.${format}`;
  const outputPath = path.join(renderDir, outputName);
  const previewName = format === "mov" ? `${baseName}-preview.webm` : outputName;
  const previewPath = path.join(renderDir, previewName);
  const outputUrl = `/renders/${template.id}/${outputName}`;
  const previewUrl = `/renders/${template.id}/${previewName}`;
  const job = { id: jobId, status: "running", phase: "rendering", templateId: template.id, format, output: null, preview: null, log: "" };
  jobs.set(jobId, job);

  const fail = (message, code = 1) => {
    job.status = "failed";
    job.phase = "failed";
    job.code = code;
    if (message) job.log += `\n${message}\n`;
  };

  const complete = () => {
    job.status = "complete";
    job.phase = "complete";
    job.code = 0;
    job.output = outputUrl;
    job.preview = previewUrl;
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
      const templates = await Promise.all(catalog.templates.map(async (item) => {
        const template = await getTemplate(item.id);
        return { ...item, schema: await readVariableSchema(template.absolutePath), presets: await listPresets(template) };
      }));
      return json(response, 200, { ...catalog, templates });
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
      const job = await startRender(template, schema, body.variables || {}, body.quality === "high" ? "high" : "draft", body.format);
      return json(response, 202, job);
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
});
