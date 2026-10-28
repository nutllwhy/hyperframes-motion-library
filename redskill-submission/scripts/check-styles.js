import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";
import { readCatalog, readStyleCatalog, readVariableSchema, resolveVariants, root, templateOrientations } from "./library.js";

const args = process.argv.slice(2);
const baseUrl = (args.find((arg) => arg.startsWith("--base-url="))?.slice(11) || "http://localhost:4312").replace(/\/$/, "");
const screenshots = args.includes("--screenshots");
const templateFilter = args.find((arg) => arg.startsWith("--template="))?.slice(11);
const styleFilter = args.find((arg) => arg.startsWith("--style="))?.slice(8);
const outputDirectory = path.join(root, ".temp", "style-qa");

async function firstExecutable(candidates) {
  for (const candidate of candidates.filter(Boolean)) {
    try { await fs.access(candidate); return candidate; } catch {}
  }
  return null;
}

async function chromePath() {
  const home = os.homedir();
  const platform = os.platform();
  if (platform === "darwin") return firstExecutable([
    process.env.CHROME_PATH,
    path.join(home, "Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell"),
    path.join(home, "Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    path.join(home, "Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
  ]);
  if (platform === "win32") return firstExecutable([
    process.env.CHROME_PATH,
    path.join(process.env.PROGRAMFILES || "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] || "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe")
  ]);
  return firstExecutable([process.env.CHROME_PATH, "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]);
}

async function cachedGsap() {
  const local = await firstExecutable([path.join(root, "node_modules/gsap/dist/gsap.min.js")]);
  if (local) return fs.readFile(local, "utf8");
  try {
    const files = execFileSync("rg", ["--files", path.join(os.homedir(), ".npm/_npx"), "-g", "gsap.min.js"], { encoding: "utf8", maxBuffer: 5 * 1024 * 1024 });
    const filename = files.trim().split("\n").find(Boolean);
    if (filename) return fs.readFile(filename, "utf8");
  } catch {}
  try {
    const response = await fetch("https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js", { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    throw new Error(`风格检查需要 GSAP；本机无缓存且下载失败：${error.message}`);
  }
}

const executablePath = await chromePath();
if (!executablePath) throw new Error("没有找到 Chrome，请设置 CHROME_PATH。");
const [catalog, styleCatalog, gsap] = await Promise.all([readCatalog(), readStyleCatalog(), cachedGsap()]);
await fs.mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
const results = [];
const transparentResults = [];
const baseOrigin = new URL(baseUrl).origin;
const representativeIds = new Set(["big-number-card", "bar-chart-grow", "three-step-flow"]);

async function inspectComposition(template, orientation, style, exportMode = "mp4") {
  const variant = resolveVariants(template)[orientation];
  const width = orientation === "portrait" ? 1080 : 1920;
  const height = orientation === "portrait" ? 1920 : 1080;
  const schema = await readVariableSchema(path.join(root, template.path, variant.path || ""));
  const variables = { ...Object.fromEntries(schema.map((field) => [field.id, field.default])), styleId: style.id, exportMode };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.addInitScript((values) => { window.__hyperframes = { getVariables: () => ({ ...values }) }; }, variables);
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (new URL(url).pathname === "/favicon.ico") return route.fulfill({ status: 204, body: "" });
    if (/\/gsap(?:\.min)?\.js(?:\?|$)/.test(url) && gsap) return route.fulfill({ contentType: "application/javascript", body: gsap });
    if (new URL(url).origin !== baseOrigin) return route.fulfill({ status: 204, body: "" });
    return route.continue();
  });
  const id = `${template.id}${orientation === "portrait" ? ":portrait" : ""}/${style.id}`;
  try {
    const response = await page.goto(`${baseUrl}/${[template.path, variant.path || "", "index.html"].filter(Boolean).join("/")}`, { waitUntil: "load", timeout: 15000 });
    if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`);
    // GSAP timelines are thenable; returning the timeline would await completion
    // forever because the render contract intentionally keeps it paused.
    await page.waitForFunction(() => Boolean(window.__timelines?.main), null, { timeout: 10000 });
    await page.evaluate(() => document.fonts.ready);
    const midpoint = (variant.duration || template.duration) / 2;
    await page.evaluate((time) => { window.__timelines.main.pause(time, false); }, midpoint);
    const measurement = await page.evaluate(({ selectors, expectedStyleId, expectedBackground }) => {
      const rootElement = document.querySelector("[data-composition-id]");
      const rootRect = rootElement.getBoundingClientRect();
      function rgba(input) {
        const context = document.createElement("canvas").getContext("2d");
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = input;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data].map((value, index) => index === 3 ? value / 255 : value);
      }
      const rootBackground = rgba(getComputedStyle(rootElement).backgroundColor);
      const expected = rgba(expectedBackground);
      const problems = [];
      if (document.documentElement.dataset.motionStyle !== expectedStyleId) problems.push("styleId 没有应用到 DOM");
      const subjects = [...new Set(selectors.flatMap((selector) => [...document.querySelectorAll(selector)]))];
      const visibleSubjects = subjects.filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > .05 && rect.width > 0 && rect.height > 0;
      });
      if (!visibleSubjects.length) problems.push("画面没有可见信息主体");
      for (const element of visibleSubjects) {
        const rect = element.getBoundingClientRect();
        if (![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)) problems.push("主体边界存在非有限值");
        if (rect.right < rootRect.left || rect.left > rootRect.right || rect.bottom < rootRect.top || rect.top > rootRect.bottom) problems.push(`主体离开画布：${element.id || element.className}`);
      }
      const clipping = [];
      const contrast = [];
      function backgroundFor(element) {
        for (let current = element; current; current = current.parentElement) {
          const background = rgba(getComputedStyle(current).backgroundColor);
          if (background[3] > .95) return background;
        }
        return rootBackground;
      }
      function luminance(color) {
        const values = color.slice(0, 3).map((value) => { const x = value / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; });
        return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
      }
      for (const element of rootElement.querySelectorAll("*")) {
        if (element.children.length || !element.textContent.trim()) continue;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) < .95 || rect.width < 1 || rect.height < 1) continue;
        const label = `${element.id ? `#${element.id}` : element.tagName.toLowerCase()} “${element.textContent.trim().slice(0, 32)}”`;
        // scrollWidth also includes ::before/::after decorations and harmless
        // visible overflow. Measure glyphs and only reject an actual clip edge.
        const range = document.createRange();
        range.selectNodeContents(element);
        const textRect = range.getBoundingClientRect();
        if (textRect.width > 0 && textRect.height > 0) {
          for (let ancestor = element; ancestor && rootElement.contains(ancestor); ancestor = ancestor.parentElement) {
            const ancestorStyle = getComputedStyle(ancestor);
            const clipX = ["hidden", "clip", "scroll", "auto"].includes(ancestorStyle.overflowX);
            const clipY = ["hidden", "clip", "scroll", "auto"].includes(ancestorStyle.overflowY);
            if (!clipX && !clipY) continue;
            const clipRect = ancestor.getBoundingClientRect();
            if (clipRect.width < 1 || clipRect.height < 1) continue;
            const overflowX = Math.max(clipRect.left - textRect.left, textRect.right - clipRect.right, 0);
            const overflowY = Math.max(clipRect.top - textRect.top, textRect.bottom - clipRect.bottom, 0);
            if ((clipX && overflowX > 4) || (clipY && overflowY > 4)) {
              const clipLabel = ancestor.id ? `#${ancestor.id}` : ancestor.tagName.toLowerCase();
              clipping.push(`${label} 被 ${clipLabel} 裁切${clipX && overflowX > 4 ? `，横向 ${overflowX.toFixed(1)}px` : ""}${clipY && overflowY > 4 ? `，纵向 ${overflowY.toFixed(1)}px` : ""}`);
              break;
            }
          }
        }
        const color = rgba(element instanceof SVGElement ? style.fill : style.color);
        const background = backgroundFor(element);
        if (background[3] < .95 || color[3] < .95) continue;
        const a = luminance(color), b = luminance(background);
        const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        const size = Number.parseFloat(style.fontSize);
        const threshold = size >= 24 || (size >= 18.66 && Number.parseInt(style.fontWeight) >= 700) ? 3 : 4.5;
        if (ratio + .05 < threshold) contrast.push(`${label} ${ratio.toFixed(2)}:1（需 ${threshold}:1）`);
      }
      return { problems, clipping, contrast, rootBackground, expectedBackground: expected, styleId: document.documentElement.dataset.motionStyle };
    }, { selectors: variant.director.subjectSelectors, expectedStyleId: style.id, expectedBackground: style.tokens.background });
    const first = await page.screenshot();
    await page.evaluate((times) => { window.__timelines.main.pause(times[0], false); window.__timelines.main.pause(times[1], false); }, [.15, midpoint]);
    const second = await page.screenshot();
    const deterministic = first.equals(second);
    if (!deterministic) measurement.problems.push("A→B→A 寻帧返回后截图不一致");
    if (exportMode === "transparent") {
      if (measurement.rootBackground[3] !== 0) measurement.problems.push("透明导出仍有不透明画布背景");
    } else if (style.id !== styleCatalog.defaultStyleId && measurement.rootBackground.some((value, index) => Math.abs(value - measurement.expectedBackground[index]) > 1)) {
      measurement.problems.push("画布底色与风格注册表不一致");
    }
    if (screenshots && exportMode === "mp4" && orientation === "landscape" && representativeIds.has(template.id)) {
      await page.screenshot({ path: path.join(outputDirectory, `${style.id}-${template.id}.png`) });
    }
    return { id, exportMode, errors, ...measurement, deterministic };
  } catch (error) {
    return { id, exportMode, errors: [...errors, error.message], problems: [], clipping: [], contrast: [], deterministic: false };
  } finally { await page.close(); }
}

try {
  for (const template of catalog.templates.filter((item) => !templateFilter || item.id === templateFilter)) {
    for (const orientation of templateOrientations(template)) {
      for (const style of styleCatalog.styles.filter((item) => !styleFilter || item.id === styleFilter)) {
        const result = await inspectComposition(template, orientation, style);
        results.push(result);
        const count = result.errors.length + result.problems.length + result.clipping.length + (style.id === styleCatalog.defaultStyleId ? 0 : result.contrast.length);
        console.log(`${count ? "发现" : "通过"} ${result.id}${count ? `：${count} 项` : ""}`);
        if (count) console.log([...result.errors, ...result.problems, ...result.clipping, ...(style.id === styleCatalog.defaultStyleId ? [] : result.contrast)].map((message) => `  ${message}`).join("\n"));
      }
    }
  }
  const transparentTemplate = catalog.templates.find((template) => template.id === "big-number-card") || catalog.templates[0];
  for (const style of styleCatalog.styles.filter((item) => !styleFilter || item.id === styleFilter)) transparentResults.push(await inspectComposition(transparentTemplate, "landscape", style, "transparent"));
} finally { await browser.close(); }

const failed = results.filter((result) => result.errors.length || result.problems.length || result.clipping.length || (!result.id.endsWith(`/${styleCatalog.defaultStyleId}`) && result.contrast.length));
const transparencyFailed = transparentResults.filter((result) => result.errors.length || result.problems.length);
await fs.writeFile(path.join(outputDirectory, "report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, cachedGsap: Boolean(gsap), results, transparentResults, failedCount: failed.length + transparencyFailed.length }, null, 2) + "\n");
for (const result of [...failed, ...transparencyFailed]) console.error(`${result.id} (${result.exportMode})\n${[...result.errors, ...result.problems, ...result.clipping, ...result.contrast].map((message) => `  ${message}`).join("\n")}`);
console.log(`风格检查：${results.length} 组模板×风格，${transparentResults.length} 组透明背景；失败 ${failed.length + transparencyFailed.length} 组。报告：.temp/style-qa/report.json`);
if (failed.length || transparencyFailed.length) process.exitCode = 1;
