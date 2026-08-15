import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright-core";
import { readCatalog, root } from "./library.js";

const strict = process.argv.includes("--strict");
const json = process.argv.includes("--json");
const updateSnapshots = process.argv.includes("--update-snapshots");

async function firstExecutable(candidates) {
  for (const candidate of candidates.filter(Boolean)) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }
  return null;
}

async function chromePath() {
  const platform = os.platform();
  const home = os.homedir();
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

function within(value, range) {
  return value >= range.min && value <= range.max;
}

const executablePath = await chromePath();
if (!executablePath) throw new Error("没有找到 Chrome。请安装 Chrome，或通过 CHROME_PATH 指定浏览器路径。");
const catalog = await readCatalog();
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.route(/^https?:\/\//, (route) => route.abort());
const results = [];
try {
  for (const template of catalog.templates) {
    if (!json) process.stdout.write(`测量 ${template.id}… `);
    else process.stderr.write(`测量 ${template.id}…\n`);
    await page.goto(`file://${path.join(root, template.path, "index.html")}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForFunction(() => document.querySelector("[data-composition-id]"), null, { timeout: 5000 });
    await page.waitForTimeout(220);
    const measurement = await page.evaluate(({ subjectSelectors, frameSelectors }) => {
      const rootElement = document.querySelector("[data-composition-id]");
      const frame = rootElement.getBoundingClientRect();
      function measure(selectors) {
        const elements = [...new Set(selectors.flatMap((selector) => [...document.querySelectorAll(selector)]))];
        for (const element of elements) {
          element.style.setProperty("transform", "none", "important");
          element.style.setProperty("opacity", "1", "important");
        }
        const rects = elements.map((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return { rect, visible: style.display !== "none" && style.visibility !== "hidden" && rect.width > 1 && rect.height > 1 };
        }).filter((entry) => entry.visible).map((entry) => entry.rect);
        if (!rects.length) return { occupancy: 0, span: { width: 0, height: 0 }, bounds: null };
        const left = Math.max(frame.left, Math.min(...rects.map((rect) => rect.left)));
        const top = Math.max(frame.top, Math.min(...rects.map((rect) => rect.top)));
        const right = Math.min(frame.right, Math.max(...rects.map((rect) => rect.right)));
        const bottom = Math.min(frame.bottom, Math.max(...rects.map((rect) => rect.bottom)));
        const width = Math.max(0, right - left);
        const height = Math.max(0, bottom - top);
        return {
          occupancy: width * height / (frame.width * frame.height),
          span: { width: width / frame.width, height: height / frame.height },
          bounds: { x: left - frame.left, y: top - frame.top, width, height }
        };
      }
      return { content: measure(subjectSelectors), frameRegion: measure(frameSelectors || subjectSelectors) };
    }, { subjectSelectors: template.director.subjectSelectors, frameSelectors: template.director.frameSelectors });
    const occupancy = Number(measurement.content.occupancy.toFixed(3));
    const span = {
      width: Number(measurement.content.span.width.toFixed(3)),
      height: Number(measurement.content.span.height.toFixed(3))
    };
    const frameOccupancy = Number(measurement.frameRegion.occupancy.toFixed(3));
    const current = Number(template.director.measuredOccupancy);
    const rangeOk = within(occupancy, template.director.occupancy);
    const snapshotOk = Number.isFinite(current) && Math.abs(current - occupancy) <= 0.02;
    const spanTarget = template.director.span || { minWidth: 0, maxWidth: 1, minHeight: 0, maxHeight: 1 };
    const spanOk = span.width >= spanTarget.minWidth && span.width <= spanTarget.maxWidth && span.height >= spanTarget.minHeight && span.height <= spanTarget.maxHeight;
    const measuredSpan = template.director.measuredSpan;
    const spanSnapshotOk = measuredSpan && Math.abs(measuredSpan.width - span.width) <= 0.02 && Math.abs(measuredSpan.height - span.height) <= 0.02;
    results.push({ id: template.id, mode: template.director.defaultMode, layoutStatus: template.director.layoutStatus, occupancy, span, frameOccupancy, target: template.director.occupancy, spanTarget, bounds: measurement.content.bounds, rangeOk, spanOk, snapshotOk, spanSnapshotOk });
    if (!json) console.log(`面积 ${Math.round(occupancy * 100)}% · 横 ${Math.round(span.width * 100)}% · 纵 ${Math.round(span.height * 100)}%`);
  }
} finally {
  await browser.close();
}

if (json) console.log(JSON.stringify(results, null, 2));
else {
  for (const result of results) {
    const passes = result.rangeOk && result.spanOk;
    const snapshots = result.snapshotOk && result.spanSnapshotOk;
    const status = snapshots && (passes || result.layoutStatus === "needs-redesign") ? (passes ? "通过" : "待重构") : !passes ? "超出目标" : "快照过期";
    console.log(`${status.padEnd(4)} ${result.id.padEnd(28)} 面积 ${Math.round(result.occupancy * 100)}% · 横 ${Math.round(result.span.width * 100)}% · 纵 ${Math.round(result.span.height * 100)}%`);
  }
}
if (updateSnapshots) {
  const byId = new Map(results.map((result) => [result.id, result]));
  for (const template of catalog.templates) {
    const result = byId.get(template.id);
    template.director.measuredOccupancy = result.occupancy;
    template.director.measuredSpan = result.span;
  }
  await fs.writeFile(path.join(root, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);
  if (!json) console.log("已更新 catalog.json 的真实内容铺开度快照。");
}
const failed = results.filter((result) => !result.snapshotOk || !result.spanSnapshotOk || ((!result.rangeOk || !result.spanOk) && result.layoutStatus !== "needs-redesign"));
if (strict && failed.length) {
  console.error(`画面占用检查失败：${failed.map((item) => item.id).join("、")}`);
  process.exit(1);
}
