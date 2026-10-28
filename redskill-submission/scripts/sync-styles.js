import fs from "node:fs/promises";
import path from "node:path";
import { root } from "./library.js";

// Keep each template independently renderable: no parent-folder asset requests in HyperFrames.
const catalog = JSON.parse(await fs.readFile(path.join(root, "styles/catalog.json"), "utf8"));
const registry = JSON.stringify(catalog).replaceAll("<", "\\u003c");
const css = await fs.readFile(path.join(root, "styles/runtime.css"), "utf8");
const runtime = await fs.readFile(path.join(root, "styles/runtime.js"), "utf8");
const templates = JSON.parse(await fs.readFile(path.join(root, "catalog.json"), "utf8"));
const styleField = { id: "styleId", type: "enum", label: "画面风格", default: catalog.defaultStyleId, hidden: true, options: catalog.styles.map(({ id, name }) => ({ value: id, label: name })) };
const check = process.argv.includes("--check");
let count = 0;
for (const template of templates.templates) {
  const variants = new Set(["", ...Object.values(template.variants || {}).map((variant) => variant.path || "")]);
  for (const variant of variants) {
    const file = path.join(root, template.path, variant, "index.html");
    let html = await fs.readFile(file, "utf8");
    const original = html;
    html = html.replace(/data-composition-variables='([^']+)'/s, (_, json) => {
      const schema = JSON.parse(json).filter((item) => item.id !== "styleId");
      schema.push(styleField);
      return `data-composition-variables='${JSON.stringify(schema)}'`;
    });
    html = html.replace(/ease:\s*(["'])([^"']+)\1/g, (_, quote, ease) => `ease: MotionStyles.ease(${JSON.stringify(ease)})`);
    const block = `\n<!-- motion-style:start -->\n<style data-motion-style-runtime>\n${css.trim()}\n</style>\n<script data-motion-style-runtime>window.__motionStyleCatalog=${registry};\n${runtime.trim()}\n</script>\n<!-- motion-style:end -->\n`;
    // DOM and schema exist, while the template has not constructed its timeline yet.
    const bodyStart = html.indexOf("<body");
    const scriptStart = html.indexOf("<script", bodyStart);
    if (scriptStart < 0) throw new Error(`没有模板脚本：${file}`);
    if (html.includes("<!-- motion-style:start -->")) {
      html = html.replace(/<!-- motion-style:start -->[\s\S]*?<!-- motion-style:end -->/, block.trim());
    } else {
      html = html.slice(0, scriptStart) + block + html.slice(scriptStart);
    }
    if (!html.includes("MotionStyles.finish(")) {
      html = html.replace(/(window\.__timelines(?:\.main|\["main"\])\s*=\s*(\w+)\s*;)/, "$1 MotionStyles.finish($2);");
    }
    if (!html.includes("MotionStyles.finish(")) throw new Error(`没有找到主时间线：${file}`);
    html = html.replace(/[\t ]+$/gm, "");
    if (check && html !== original) throw new Error(`风格运行时需要同步：${path.relative(root, file)}。请运行 npm run sync:styles`);
    if (!check && html !== original) await fs.writeFile(file, html);
    count++;
  }
}
console.log(`风格${check ? "一致性检查通过" : "运行时已同步"}：${catalog.styles.length} 套风格，${count} 份横竖屏模板。`);
