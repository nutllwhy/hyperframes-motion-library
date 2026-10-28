const state = {
  catalog: null,
  selected: null,
  values: {},
  format: "mp4",
  orientation: "landscape",
  output: null,
  previewOutput: null,
  view: "library",
  staticDemo: false,
  category: "全部",
  plan: null,
  activeSceneId: null,
  batchRunning: false,
  libraryStyleId: "classic-orange"
};
let previewResizeObserver = null;
let previewRefreshTimer = null;
let previewRevision = 0;
const list = document.querySelector("#template-list");
const workspace = document.querySelector("#workspace");
const cardTemplate = document.querySelector("#template-card");
const search = document.querySelector("#search");
const categoryFilters = document.querySelector("#category-filters");
const filterSummary = document.querySelector("#filter-summary");
const showLibrary = document.querySelector("#show-library");
const showPlan = document.querySelector("#show-plan");
const showGuide = document.querySelector("#show-guide");
const GITHUB_REPO = "https://github.com/nutllwhy/hyperframes-motion-library";
const FORMAT_META = {
  mp4: {
    label: "纯色底 MP4（剪映直接使用）",
    note: "保留所选风格的纯色背景，兼容剪映等常用剪辑软件。"
  },
  mov: {
    label: "透明 MOV（推荐剪映，文件较大）",
    note: "保留透明通道，适合叠在口播画面上；本地会自动转成 ProRes 4444 MOV。"
  },
  webm: {
    label: "透明 WebM（部分软件不支持）",
    note: "文件更小并保留透明通道，适合网页和支持 WebM 的剪辑软件。"
  }
};
const AGENT_INSTALL_PROMPT = `请帮我在本地安装并启动这个开源视频动效系统：

GitHub 仓库：
https://github.com/nutllwhy/hyperframes-motion-library

请按下面步骤执行：
1. 选择一个合适的本地目录，克隆这个仓库。
2. 进入 hyperframes-motion-library 目录。
3. 运行 npm install 安装依赖。
4. 运行 npm run dev 启动本地服务。
5. 启动成功后，把本地访问地址发给我。
6. 先不要修改源码，也不要删除任何模板；如果遇到 Node、npm、Chrome、FFmpeg 或端口占用问题，请先告诉我原因和解决建议。

我希望先体验模板库，之后再让你基于这个项目继续帮我添加新的视频动效模板。`;
const AGENT_PLAN_PROMPT = `请先阅读这个项目的 catalog.json、styles/catalog.json、director-rules.json、motion-plan.schema.json 和 examples/motion-plan.example.json。

下面我会提供一段视频口播稿。请帮我找出适合补充数据动效或知识讲解动效的位置，并生成一份可以直接导入视频动效系统的 motion-plan.json。

要求：
1. 只使用 catalog.json 中已经存在且 status 为 ready 的模板 ID。
2. 输出 version 为 1.2；在项目顶层指定 styleId，每个场景填写准确的 timecode、templateId、variables、format 和 director。
3. director 必须包含 sourceQuote、intent、layoutMode、requiredInformation、forbiddenInformation。
4. sourceQuote 必须引用对应的原始口播；requiredInformation 只写这条动效必须出现的信息。
5. 不得添加口播与数据源中没有出现的数字、时间、状态、英文标签或模板编号。
6. layoutMode 必须符合对应模板的 director.allowedModes；独立全屏使用 fullscreen，透明叠加使用 overlay，数据图表使用 data，章节转折使用 transition。
7. fullscreen 主体必须铺满安全区，不为人物或其他素材预留半屏；只有 overlay 才能主动避让人物与字幕。
8. variables 必须符合对应模板在 catalog 或 index.html 中声明的变量类型。
9. 从 styles/catalog.json 选择整片统一风格：classic-orange 黑橙经典、paper-editorial 纸感编辑、sketch-notes 手绘笔记、bold-geometry 几何构成。默认 classic-orange。场景继承整片 styleId；确实需要转变画风时才单独声明场景 styleId，并说明原因。overlay 优先使用 mov。
10. 不要为了使用动效而使用动效，只选择真正能帮助观众理解信息的句子。
11. 最终只输出符合 motion-plan.schema.json 的 JSON，不要添加 Markdown 代码围栏。

口播稿：
【把带时间码的口播稿粘贴在这里】`;
const AGENT_STYLE_PROMPT = `请先阅读 styles/README.md、styles/catalog.json、styles/runtime.css、styles/runtime.js 和 SYSTEM.md。
我要为这套视频动效系统新增一种可反复调用的 MG 画风：
【在这里描述画风，或提供参考图】

1. 给画风分配稳定的 styleId，登记色板、字体、材质、线条、图形边缘、运动节奏、适用场景与禁用项。
2. 在统一运行时里实现，保持现有文案、数字与模板 ID；不要仅替换颜色，也不要添加没有来源的装饰文字或假数据。
3. 让整片 motion-plan V1.2 通过顶层 styleId 统一调用，场景默认继承。
4. 运行 npm run sync:styles，再运行 npm run check 和 npm run check:styles -- --screenshots。
5. 至少用大数字、图表、流程三类模板对照样张，检查横竖屏与透明背景。
6. 不要改动已有预设，也不要直接编辑模板中的生成代码。`;

async function api(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "请求失败");
  return payload;
}

async function loadCatalog() {
  try {
    return await api("./api/catalog");
  } catch {
    state.staticDemo = true;
    const response = await fetch("./catalog.static.json", { cache: "no-store" });
    if (!response.ok) throw new Error("静态演示目录读取失败");
    return response.json();
  }
}

function assetUrl(value) {
  if (!value) return value;
  if (/^(https?:|data:|blob:)/.test(value)) return value;
  return value.startsWith("/") ? `.${value}` : value;
}

function fileExtension(value) {
  const clean = String(value || "").split("?")[0];
  return clean.includes(".") ? clean.split(".").pop() : "mp4";
}

function downloadName(template) {
  const orientationPrefix = state.orientation === "portrait" ? "-portrait" : "";
  return `${template.id}${orientationPrefix}-${state.staticDemo ? "sample" : "render"}.${fileExtension(state.output)}`;
}

function hasPortrait(template) {
  return Array.isArray(template.orientations) && template.orientations.includes("portrait");
}

function variantDuration(template, orientation) {
  if (orientation === "portrait" && template.variants?.portrait?.duration) return template.variants.portrait.duration;
  return template.duration;
}

function variantPreview(template, orientation) {
  if (orientation === "portrait" && template.variants?.portrait?.preview) return template.variants.portrait.preview;
  return template.preview;
}

function previewMarkup(template) {
  if (!state.previewOutput) {
    const portrait = state.orientation === "portrait";
    const width = portrait ? 1080 : 1920;
    const height = portrait ? 1920 : 1080;
    const variant = portrait ? template.variants?.portrait?.path || "portrait" : "";
    const values = { ...state.values, exportMode: state.format === "mp4" ? "mp4" : "transparent" };
    const url = `${assetUrl(template.path)}/${variant ? `${variant}/` : ""}index.html?motionPreview=1&variables=${encodeURIComponent(JSON.stringify(values))}`;
    return `<div class="live-preview ${state.format === "mp4" ? "solid" : "transparent"}"><iframe title="${escapeAttribute(template.name)} · ${escapeAttribute(styleById(values.styleId).name)}实时预览" src="${escapeAttribute(url)}" data-preview-width="${width}" data-preview-height="${height}" style="width:${width}px;height:${height}px" scrolling="no"></iframe></div>`;
  }
  const extension = fileExtension(state.previewOutput);
  const transparent = extension === "webm" || extension === "mov";
  return `<div class="preview-media ${transparent ? "transparent" : "solid"}"><video src="${assetUrl(state.previewOutput)}" controls controlsList="nodownload" autoplay loop></video></div>`;
}

function disconnectPreview() {
  previewResizeObserver?.disconnect();
  previewResizeObserver = null;
  clearTimeout(previewRefreshTimer);
}

function mountLivePreview() {
  previewResizeObserver?.disconnect();
  const frame = workspace.querySelector(".live-preview iframe");
  if (!frame) return;
  const container = frame.parentElement;
  const fit = () => {
    const scale = Math.min(container.clientWidth / Number(frame.dataset.previewWidth), container.clientHeight / Number(frame.dataset.previewHeight));
    frame.style.transform = `scale(${scale})`;
  };
  previewResizeObserver = new ResizeObserver(fit);
  previewResizeObserver.observe(container);
  fit();
}

function refreshPreview() {
  const preview = workspace.querySelector("#preview");
  if (!preview || !state.selected) return;
  preview.innerHTML = previewMarkup(state.selected);
  workspace.querySelector("#preview-download").innerHTML = previewDownloadMarkup(state.selected);
  mountLivePreview();
}

function invalidateOutput({ deferred = false } = {}) {
  previewRevision += 1;
  state.output = null;
  state.previewOutput = null;
  workspace.querySelector("#preview-download")?.replaceChildren();
  clearTimeout(previewRefreshTimer);
  if (deferred) previewRefreshTimer = setTimeout(refreshPreview, 240);
  else refreshPreview();
}

function previewDownloadMarkup(template) {
  if (!state.output) return "";
  const extension = fileExtension(state.output);
  const localHint = extension === "mov"
    ? "这是带透明通道的 MOV，可叠加在口播画面上；文件较大属于正常情况。"
    : extension === "webm"
      ? "这是透明 WebM；如果剪映无法导入，请改选透明 MOV。"
      : "这是纯色底 MP4，可以直接导入剪映或其他剪辑软件。";
  const hint = state.staticDemo
    ? "线上演示下载的是预渲染样片，不会根据右侧参数重新生成；WebM 是透明叠加视频格式，不是网页文件。"
    : localHint;
  return `
    <div class="preview-download-row">
      <a class="button preview-download" href="${assetUrl(state.output)}" download="${downloadName(template)}">${state.staticDemo ? "下载当前样片" : "下载当前视频"}</a>
      <span>${hint}${state.orientation === "portrait" ? " 当前为竖屏 9:16 画幅。" : ""}</span>
    </div>`;
}

function defaults(template) {
  return Object.fromEntries(template.schema.map((item) => [item.id, item.default]));
}

function availableStyles() {
  return state.catalog?.styleCatalog?.styles || [{ id: "classic-orange", name: "黑橙经典", description: "黑色底、橙色强调，沿用原有动效设计。", tokens: { background: "#12100E", foreground: "#F4EFE7", accent: "#FF5A36" } }];
}

function styleById(id) {
  return availableStyles().find((style) => style.id === id) || availableStyles()[0];
}

function requireStyleId(id) {
  if (!availableStyles().some((style) => style.id === id)) throw new Error(`未知的动效风格：${id}`);
  return id;
}

function applyStyleValues(template, values, styleId) {
  const style = styleById(requireStyleId(styleId));
  const next = { ...values, styleId: style.id };
  const tokens = style.tokens;
  for (const key of ["accent", "foreground", "background", "bg"]) {
    const token = key === "bg" ? tokens.background : tokens[key];
    if (token && template.schema.some((entry) => entry.id === key)) next[key] = token;
  }
  return next;
}

function effectiveSceneStyle(scene) {
  return scene.styleId || state.plan?.styleId || "classic-orange";
}

function styleChooserMarkup(styleId, scope = "template") {
  return `<section class="style-chooser ${scope === "project" ? "project-style-chooser" : ""}" aria-label="${scope === "project" ? "整片风格" : "动效风格"}">
    <div class="style-chooser-heading"><h2>${scope === "project" ? "整片统一风格" : "动效风格"}</h2><span>${scope === "project" ? "所有跟随整片的任务会同步切换" : "字体 · 材质 · 图形 · 运动"}</span></div>
    <div class="style-options" role="group" aria-label="选择风格">${availableStyles().map((style) => `<button type="button" class="style-option ${style.id === styleId ? "active" : ""}" data-style-id="${escapeAttribute(style.id)}" data-style-scope="${scope}" aria-pressed="${style.id === styleId}" ${state.batchRunning ? "disabled" : ""}>
      <span class="style-swatch ${escapeAttribute(style.id)}" style="--swatch-bg:${escapeAttribute(style.tokens.background)};--swatch-fg:${escapeAttribute(style.tokens.foreground)};--swatch-accent:${escapeAttribute(style.tokens.accent)}" aria-hidden="true"><span>Aa</span><i></i><b></b></span>
      <strong>${escapeHtml(style.name)}</strong><small>${escapeHtml(style.description)}</small>
    </button>`).join("")}</div>
  </section>`;
}

function sceneStyleMarkup(scene) {
  if (!scene) return "";
  return `<section class="scene-style-field"><label for="scene-style">这条动效的风格</label><select id="scene-style"><option value="" ${!scene.styleId ? "selected" : ""}>跟随整片 · ${escapeHtml(styleById(state.plan.styleId).name)}</option>${availableStyles().map((style) => `<option value="${escapeAttribute(style.id)}" ${scene.styleId === style.id ? "selected" : ""}>单独使用 · ${escapeHtml(style.name)}</option>`).join("")}</select><p class="field-note">默认跟随整片。只有内容确实需要切换画风时，才单独指定。</p></section>`;
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function templateById(templateId) {
  return state.catalog.templates.find((template) => template.id === templateId);
}

function activeScene() {
  return state.plan?.scenes.find((scene) => scene.id === state.activeSceneId) || null;
}

function directorRules() {
  return state.catalog.directorRules || { layoutModes: {}, defaultForbiddenInformation: [], principles: [] };
}

function layoutModeMeta(mode) {
  return directorRules().layoutModes?.[mode] || { label: mode || "未选择", description: "", occupancy: { min: 0, max: 1 }, recommendedFormats: [] };
}

function normalizeTextList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12);
}

function meaningfulVariableValues(template, variables) {
  return template.schema
    .filter((item) => !item.hidden && !["color", "boolean"].includes(item.type) && !["accent", "foreground", "exportMode", "styleId"].includes(item.id))
    .map((item) => String(variables[item.id] ?? "").trim())
    .filter(Boolean);
}

function fallbackDirector(template, item, variables) {
  const values = meaningfulVariableValues(template, variables).slice(0, 4);
  return {
    sourceQuote: typeof item.director?.sourceQuote === "string" ? item.director.sourceQuote.trim() : "",
    intent: typeof item.director?.intent === "string" ? item.director.intent.trim() : "",
    layoutMode: typeof item.director?.layoutMode === "string" ? item.director.layoutMode : template.director.defaultMode,
    requiredInformation: normalizeTextList(item.director?.requiredInformation).length ? normalizeTextList(item.director.requiredInformation) : values,
    forbiddenInformation: normalizeTextList(item.director?.forbiddenInformation).length ? normalizeTextList(item.director.forbiddenInformation) : [...directorRules().defaultForbiddenInformation]
  };
}

function directorAudit(scene) {
  const template = templateById(scene.templateId);
  const director = scene.director || {};
  const errors = [];
  const warnings = [];
  if (!director.sourceQuote?.trim()) errors.push("缺少对应的原始口播");
  if (!director.intent?.trim()) errors.push("缺少这条动效的表达目的");
  if (!template.director.allowedModes.includes(director.layoutMode)) errors.push(`画面模式不适合该模板，应使用：${template.director.allowedModes.map((mode) => layoutModeMeta(mode).label).join(" / ")}`);
  if (!director.requiredInformation?.length) errors.push("缺少必须出现的信息");
  if (!director.forbiddenInformation?.length) errors.push("缺少禁止添加的信息");
  if (template.director.layoutStatus === "needs-redesign") warnings.push(`这个旧模板的真实内容铺开度不足，按当前画面模式使用前建议先做全屏重构`);
  const sourceCorpus = `${director.sourceQuote || ""} ${(director.requiredInformation || []).join(" ")}`.toLowerCase();
  const contentCorpus = meaningfulVariableValues(template, scene.variables).join(" ");
  const unexplainedNumbers = [...new Set(contentCorpus.match(/\d+(?:\.\d+)?/g) || [])].filter((token) => !sourceCorpus.includes(token.toLowerCase()));
  if (unexplainedNumbers.length) warnings.push(`这些数字未在口播或必要信息中找到依据：${unexplainedNumbers.join("、")}`);
  const unexplainedEnglish = [...new Set(contentCorpus.match(/[A-Za-z][A-Za-z0-9.-]{1,}/g) || [])].filter((token) => !sourceCorpus.includes(token.toLowerCase()));
  if (unexplainedEnglish.length) warnings.push(`请确认这些英文确实服务于表达：${unexplainedEnglish.join("、")}`);
  const meta = layoutModeMeta(director.layoutMode);
  if (meta.recommendedFormats?.length && !meta.recommendedFormats.includes(scene.format)) warnings.push(`${meta.label}更适合导出 ${meta.recommendedFormats.map((format) => format.toUpperCase()).join(" / ")}`);
  return { errors, warnings, ready: !errors.length };
}

function planAudit() {
  const scenes = state.plan?.scenes || [];
  const audits = scenes.map((scene) => directorAudit(scene));
  return {
    ready: audits.every((audit) => audit.ready),
    readyCount: audits.filter((audit) => audit.ready).length,
    errorCount: audits.reduce((sum, audit) => sum + audit.errors.length, 0),
    warningCount: audits.reduce((sum, audit) => sum + audit.warnings.length, 0)
  };
}

function validateSceneVariables(template, values, index) {
  const declarations = new Map(template.schema.map((item) => [item.id, item]));
  for (const [key, value] of Object.entries(values)) {
    const declaration = declarations.get(key);
    if (!declaration) throw new Error(`第 ${index + 1} 项使用了 ${template.name} 未声明的变量：${key}`);
    if (declaration.type === "number" && typeof value !== "number") throw new Error(`第 ${index + 1} 项的 ${key} 必须是数字`);
    if (["string", "color", "enum"].includes(declaration.type) && typeof value !== "string") throw new Error(`第 ${index + 1} 项的 ${key} 必须是文本`);
    if (declaration.type === "boolean" && typeof value !== "boolean") throw new Error(`第 ${index + 1} 项的 ${key} 必须是布尔值`);
    if (declaration.type === "color" && !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`第 ${index + 1} 项的 ${key} 必须是六位十六进制颜色`);
    if (declaration.type === "enum" && !declaration.options?.some((option) => option.value === value)) throw new Error(`第 ${index + 1} 项的 ${key} 不是允许的选项`);
  }
}

function normalizeMotionPlan(raw) {
  if (!raw || !["1.0", "1.1", "1.2"].includes(raw.version)) throw new Error("motion plan 的 version 必须是 1.0、1.1 或 1.2");
  if (typeof raw.project !== "string" || !raw.project.trim()) throw new Error("motion plan 缺少项目名称 project");
  if (!Array.isArray(raw.scenes) || !raw.scenes.length) throw new Error("motion plan 至少需要一个 scenes 项目");
  if (raw.scenes.length > 50) throw new Error("一次最多导入 50 个动效任务");
  const ids = new Set();
  if (raw.version === "1.2" && !raw.styleId) throw new Error("V1.2 方案缺少整片风格 styleId");
  const projectStyleId = requireStyleId(raw.styleId || "classic-orange");
  const planFormat = ["mp4", "mov", "webm"].includes(raw.outputFormat) ? raw.outputFormat : "mp4";
  const scenes = raw.scenes.map((item, index) => {
    const template = templateById(item.templateId);
    if (!template || template.status !== "ready") throw new Error(`第 ${index + 1} 项引用了不存在或未就绪的模板：${item.templateId}`);
    if (typeof item.timecode !== "string" || !/^(?:\d{1,2}:)?[0-5]?\d:[0-5]\d$/.test(item.timecode)) throw new Error(`第 ${index + 1} 项的 timecode 格式不正确`);
    const preset = item.preset ? template.presets.find((entry) => entry.id === item.preset) : null;
    if (item.preset && !preset) throw new Error(`第 ${index + 1} 项找不到预设：${item.preset}`);
    const editableDefaults = Object.fromEntries(template.schema.filter((declaration) => !declaration.hidden).map((declaration) => [declaration.id, declaration.default]));
    const overrideStyleId = item.styleId ? requireStyleId(item.styleId) : null;
    const styleId = overrideStyleId || projectStyleId;
    if (item.variables?.styleId && item.variables.styleId !== styleId) throw new Error(`第 ${index + 1} 项的 variables.styleId 与场景或整片风格不一致`);
    const variables = { ...editableDefaults, ...(preset?.values || {}), ...(item.variables || {}), styleId };
    for (const declaration of template.schema.filter((entry) => entry.hidden && entry.id !== "styleId")) delete variables[declaration.id];
    if (styleId !== "classic-orange") {
      const tokens = styleById(styleId).tokens;
      for (const key of ["accent", "foreground", "background", "bg"]) {
        const declaration = template.schema.find((entry) => entry.id === key);
        const token = key === "bg" ? tokens.background : tokens[key];
        if (declaration && token && (variables[key] === undefined || variables[key] === declaration.default)) variables[key] = token;
      }
    }
    validateSceneVariables(template, variables, index);
    const format = ["mp4", "mov", "webm"].includes(item.format) ? item.format : planFormat;
    if (!(template.formats || ["mp4"]).includes(format)) throw new Error(`第 ${index + 1} 项的 ${template.name} 不支持 ${format}`);
    let id = String(item.id || `scene-${index + 1}`).trim();
    if (!id) id = `scene-${index + 1}`;
    if (ids.has(id)) id = `${id}-${index + 1}`;
    ids.add(id);
    const orientation = hasPortrait(template) && item.orientation === "portrait" ? "portrait" : "landscape";
    return {
      id,
      timecode: item.timecode,
      note: typeof item.note === "string" ? item.note : "",
      director: fallbackDirector(template, item, variables),
      templateId: template.id,
      ...(overrideStyleId ? { styleId: overrideStyleId } : {}),
      format,
      orientation,
      variables,
      status: "pending",
      output: null,
      preview: null,
      error: null
    };
  });
  return { version: raw.version, importedVersion: raw.version, project: raw.project.trim(), styleId: projectStyleId, outputFormat: planFormat, scenes };
}

function serializablePlan() {
  if (!state.plan) return null;
  return {
    version: planAudit().ready ? "1.2" : "1.0",
    project: state.plan.project,
    styleId: state.plan.styleId,
    outputFormat: state.plan.outputFormat,
    scenes: state.plan.scenes.map((scene) => ({
      id: scene.id,
      timecode: scene.timecode,
      note: scene.note,
      ...(directorAudit(scene).ready ? { director: scene.director } : {}),
      templateId: scene.templateId,
      ...(scene.styleId ? { styleId: scene.styleId } : {}),
      format: scene.format,
      ...(scene.orientation === "portrait" ? { orientation: scene.orientation } : {}),
      variables: scene.variables
    }))
  };
}

function sceneSummary(scene) {
  const template = templateById(scene.templateId);
  return template.schema
    .filter((item) => !item.hidden && scene.variables[item.id] !== undefined)
    .slice(0, 3)
    .map((item) => `${item.label}：${scene.variables[item.id]}`)
    .join(" · ");
}

function markActiveScenePending() {
  const scene = activeScene();
  if (!scene) return;
  scene.variables = { ...state.values };
  scene.format = state.format;
  scene.status = "pending";
  scene.error = null;
  scene.output = null;
  scene.preview = null;
}

function filteredTemplates(query = search.value) {
  const needle = query.trim().toLowerCase();
  return state.catalog.templates.filter((template) => {
    const categoryMatches = state.category === "全部" || template.category === state.category;
    const searchMatches = !needle || JSON.stringify(template).toLowerCase().includes(needle);
    return categoryMatches && searchMatches;
  });
}

function renderCategoryFilters() {
  const categories = ["全部", ...new Set(state.catalog.templates.map((template) => template.category))];
  categoryFilters.innerHTML = categories.map((category) => {
    const count = category === "全部" ? state.catalog.templates.length : state.catalog.templates.filter((template) => template.category === category).length;
    return `<button class="category-filter ${state.category === category ? "active" : ""}" type="button" data-category="${escapeAttribute(category)}">${escapeHtml(category)}<span>${count}</span></button>`;
  }).join("");
  categoryFilters.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => {
    state.category = button.dataset.category;
    renderCategoryFilters();
    const visible = filteredTemplates();
    if (visible.length && !visible.some((template) => template.id === state.selected?.id)) selectTemplate(visible[0]);
    else renderList();
  }));
}

function renderList(query = "") {
  list.innerHTML = "";
  const visible = filteredTemplates(query);
  filterSummary.textContent = `显示 ${visible.length} / ${state.catalog.templates.length} 个模板`;
  if (!visible.length) {
    list.innerHTML = `<div class="template-list-empty">没有找到匹配的模板。<br>可以换一个分类或关键词。</div>`;
    return;
  }
  visible.forEach((template) => {
    const fragment = cardTemplate.content.cloneNode(true);
    const button = fragment.querySelector("button");
    button.dataset.id = template.id;
    button.classList.toggle("active", state.selected?.id === template.id);
    fragment.querySelector(".template-category").textContent = template.category;
    fragment.querySelector(".template-name").textContent = template.name;
    fragment.querySelector(".template-description").textContent = template.description;
    const mode = layoutModeMeta(template.director.defaultMode).label;
    const span = template.director.measuredSpan;
    const layout = template.director.layoutStatus === "needs-redesign" ? "需重构" : `铺开 ${Math.round(span.width * 100)}×${Math.round(span.height * 100)}%`;
    const orientationLabel = hasPortrait(template) ? " · 横屏+竖屏" : "";
    fragment.querySelector(".template-meta").textContent = `${variantDuration(template, "landscape")}s · ${template.size}${orientationLabel} · ${mode} · ${layout} · ${template.presets.length} 个预设`;
    button.addEventListener("click", () => selectTemplate(template));
    list.append(fragment);
  });
}

function fieldMarkup(declaration) {
  if (declaration.hidden) return "";
  const value = state.values[declaration.id];
  if (declaration.type === "color") {
    return `<div class="field"><label for="field-${declaration.id}-text">${declaration.label}</label><div class="color-field"><input aria-label="${declaration.label}色板" type="color" data-key="${declaration.id}" value="${value}"><input id="field-${declaration.id}-text" type="text" data-key="${declaration.id}" value="${value}"></div></div>`;
  }
  if (declaration.type === "enum") {
    const options = declaration.options.map((option) => `<option value="${option.value}" ${option.value === value ? "selected" : ""}>${option.label}</option>`).join("");
    return `<div class="field"><label for="field-${declaration.id}">${declaration.label}</label><select id="field-${declaration.id}" data-key="${declaration.id}">${options}</select></div>`;
  }
  const type = declaration.type === "number" ? "number" : "text";
  return `<div class="field"><label for="field-${declaration.id}">${declaration.label}</label><input id="field-${declaration.id}" type="${type}" data-key="${declaration.id}" value="${escapeAttribute(value)}"></div>`;
}

function presetLabel(id) {
  if (id === "default") return "默认示例";
  return id;
}

function formatOption(format, selected) {
  const meta = FORMAT_META[format] || { label: format.toUpperCase(), note: "" };
  return `<option value="${format}" ${format === selected ? "selected" : ""}>${meta.label}</option>`;
}

function formatNote(format) {
  return FORMAT_META[format]?.note || "";
}

function directorEditorMarkup(scene, template) {
  if (!scene) return "";
  const director = scene.director;
  const audit = directorAudit(scene);
  const modeOptions = template.director.allowedModes.map((mode) => {
    const meta = layoutModeMeta(mode);
    return `<option value="${escapeAttribute(mode)}" ${director.layoutMode === mode ? "selected" : ""}>${escapeHtml(meta.label)}</option>`;
  }).join("");
  return `
    <section class="director-editor">
      <div class="director-editor-heading"><div><span>DIRECTOR BRIEF</span><h2>动效导演说明</h2></div><strong class="director-readiness ${audit.ready ? "ready" : "missing"}">${audit.ready ? "可以渲染" : "需要补充"}</strong></div>
      <p class="director-help">先确认它依据哪句口播、要表达什么，再修改下面的动效内容。没有依据的信息不要加入画面。</p>
      <div class="field"><label for="director-source">原始口播</label><textarea id="director-source" data-director-key="sourceQuote" rows="4" placeholder="粘贴这条动效对应的原始口播">${escapeHtml(director.sourceQuote)}</textarea></div>
      <div class="field"><label for="director-intent">表达目的</label><textarea id="director-intent" data-director-key="intent" rows="3" placeholder="这条动效应该帮助观众理解或记住什么">${escapeHtml(director.intent)}</textarea></div>
      <div class="field"><label for="director-mode">画面模式</label><select id="director-mode" data-director-key="layoutMode">${modeOptions}</select><p class="field-note" id="director-mode-note">${escapeHtml(layoutModeMeta(director.layoutMode).description)} 独立全屏不仅要面积够大，真实内容还要同时铺开横向与纵向空间。</p></div>
      <div class="director-list-grid">
        <div class="field"><label for="director-required">必须出现的信息（每行一项）</label><textarea id="director-required" data-director-list="requiredInformation" rows="5">${escapeHtml(director.requiredInformation.join("\n"))}</textarea></div>
        <div class="field"><label for="director-forbidden">禁止添加的信息（每行一项）</label><textarea id="director-forbidden" data-director-list="forbiddenInformation" rows="5">${escapeHtml(director.forbiddenInformation.join("\n"))}</textarea></div>
      </div>
      <p class="director-template-guidance"><strong>这个模板的导演规则</strong>${escapeHtml(template.director.guidance)} 真实内容横向铺开 ${Math.round(template.director.measuredSpan.width * 100)}%，纵向铺开 ${Math.round(template.director.measuredSpan.height * 100)}%。${template.director.layoutStatus === "needs-redesign" ? "当前模板已标记为需要全屏重构。" : "当前布局已通过内容铺开检查。"}</p>
      ${audit.errors.length || audit.warnings.length ? `<div class="director-inline-audit">${audit.errors.map((item) => `<p class="error">需要补充：${escapeHtml(item)}</p>`).join("")}${audit.warnings.map((item) => `<p>检查一下：${escapeHtml(item)}</p>`).join("")}</div>` : ""}
    </section>`;
}

function orientationPillMarkup(template) {
  if (!hasPortrait(template)) return "";
  const portraitAvailable = state.orientation === "portrait";
  return `
    <div class="orientation-row" role="group" aria-label="画幅切换">
      <button class="orientation-pill ${state.orientation === "landscape" ? "active" : ""}" type="button" data-orientation="landscape">横屏 16:9</button>
      <button class="orientation-pill ${state.orientation === "portrait" ? "active" : ""}" type="button" data-orientation="portrait">竖屏 9:16</button>
      <span class="orientation-note">${portraitAvailable ? "1080×1920" : "1920×1080"} · ${variantDuration(template, state.orientation)}s</span>
    </div>`;
}

function renderWorkspace({ planEdit = false } = {}) {
  disconnectPreview();
  state.view = planEdit ? "plan-edit" : "library";
  updateNav();
  const template = state.selected;
  const scene = activeScene();
  workspace.innerHTML = `
    ${planEdit && scene ? `<div class="plan-edit-banner"><div><strong>正在编辑批量任务</strong><span>${escapeHtml(scene.timecode)} · ${escapeHtml(template.name)}</span></div><button class="button" type="button" id="back-to-plan">返回任务队列</button></div>` : ""}
    <div class="workspace-grid">
      <div class="preview-panel">
        <div class="preview ${state.orientation === "portrait" ? "portrait" : ""}" id="preview">${previewMarkup(template)}</div>
        <div id="preview-download">${previewDownloadMarkup(template)}</div>
        <h2 class="workspace-title">${template.name}</h2>
        <p class="workspace-description">${template.description}</p>
        <div class="tag-row">${template.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
      </div>
      <form class="editor" id="editor">
        ${planEdit && scene ? directorEditorMarkup(scene, template) : ""}
        ${planEdit && scene ? sceneStyleMarkup(scene) : styleChooserMarkup(state.values.styleId || "classic-orange")}
        ${orientationPillMarkup(template)}
        <h2>内容与数据</h2>
        <div class="preset-row"><select id="preset" aria-label="载入预设"><option value="">载入预设…</option>${template.presets.map((preset) => `<option value="${escapeAttribute(preset.id)}">${escapeHtml(presetLabel(preset.id))}</option>`).join("")}</select><button class="button" type="button" id="save-preset">保存</button></div>
        <div class="field"><label for="output-format">输出格式</label><select id="output-format">${(template.formats || ["mp4"]).map((format) => formatOption(format, state.format)).join("")}</select><p class="field-note" id="format-note">${formatNote(state.format)}</p></div>
        ${template.schema.map(fieldMarkup).join("")}
        <div class="action-row"><button class="button" type="button" id="reset">恢复默认</button><button class="button primary" type="submit" id="render">${state.staticDemo ? "本地运行后可渲染" : "生成草稿"}</button></div>
        <p class="status" id="status"></p>
      </form>
    </div>`;
  workspace.querySelectorAll("[data-key]").forEach((input) => input.addEventListener("input", (event) => {
    const declaration = template.schema.find((item) => item.id === event.target.dataset.key);
    const value = declaration.type === "number" ? Number(event.target.value) : event.target.value;
    state.values[declaration.id] = value;
    workspace.querySelectorAll(`[data-key="${declaration.id}"]`).forEach((peer) => { if (peer !== event.target) peer.value = value; });
    markActiveScenePending();
    invalidateOutput({ deferred: true });
  }));
  workspace.querySelectorAll("[data-director-key]").forEach((input) => input.addEventListener("input", (event) => {
    if (!scene) return;
    scene.director[event.target.dataset.directorKey] = event.target.value;
    scene.status = "pending";
    scene.output = null;
    scene.preview = null;
    if (event.target.dataset.directorKey === "layoutMode") {
      workspace.querySelector("#director-mode-note").textContent = `${layoutModeMeta(event.target.value).description} 独立全屏不仅要面积够大，真实内容还要同时铺开横向与纵向空间。`;
    }
    refreshDirectorRenderState();
  }));
  workspace.querySelectorAll("[data-director-list]").forEach((input) => input.addEventListener("input", (event) => {
    if (!scene) return;
    scene.director[event.target.dataset.directorList] = event.target.value.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 12);
    scene.status = "pending";
    scene.output = null;
    scene.preview = null;
    refreshDirectorRenderState();
  }));
  workspace.querySelectorAll("[data-orientation]").forEach((button) => button.addEventListener("click", () => {
    const next = button.dataset.orientation;
    if (next === state.orientation) return;
    state.orientation = next;
    invalidateOutput();
    const scene = activeScene();
    if (scene) { scene.orientation = next; scene.status = "pending"; scene.output = null; scene.preview = null; }
    renderWorkspace({ planEdit });
  }));
  workspace.querySelector("#preset").addEventListener("change", (event) => {
    const preset = template.presets.find((item) => item.id === event.target.value);
    if (preset) {
      const styleId = planEdit && scene ? effectiveSceneStyle(scene) : preset.values.styleId || state.values.styleId || "classic-orange";
      if (!planEdit) state.libraryStyleId = styleId;
      state.values = applyStyleValues(template, { ...defaults(template), ...preset.values }, styleId);
      // Saved palette edits belong to the preset; only style changes reset them.
      if (!planEdit && preset.values.styleId === styleId) {
        for (const declaration of template.schema.filter((entry) => entry.type === "color")) {
          if (preset.values[declaration.id] !== undefined) state.values[declaration.id] = preset.values[declaration.id];
        }
      }
      markActiveScenePending(); invalidateOutput(); renderWorkspace({ planEdit });
    }
  });
  workspace.querySelector("#reset").addEventListener("click", () => {
    const styleId = planEdit && scene ? effectiveSceneStyle(scene) : state.values.styleId || "classic-orange";
    state.values = applyStyleValues(template, defaults(template), styleId);
    markActiveScenePending(); invalidateOutput(); renderWorkspace({ planEdit });
  });
  workspace.querySelectorAll('[data-style-scope="template"]').forEach((button) => button.addEventListener("click", () => {
    state.libraryStyleId = button.dataset.styleId;
    state.values = applyStyleValues(template, state.values, state.libraryStyleId);
    invalidateOutput(); renderWorkspace({ planEdit });
  }));
  workspace.querySelector("#scene-style")?.addEventListener("change", (event) => {
    if (event.target.value) scene.styleId = event.target.value;
    else delete scene.styleId;
    state.values = applyStyleValues(template, state.values, effectiveSceneStyle(scene));
    markActiveScenePending(); invalidateOutput(); renderWorkspace({ planEdit });
  });
  workspace.querySelector("#save-preset").addEventListener("click", savePreset);
  workspace.querySelector("#output-format").addEventListener("change", (event) => {
    state.format = event.target.value;
    markActiveScenePending();
    invalidateOutput();
    workspace.querySelector("#format-note").textContent = formatNote(event.target.value);
  });
  workspace.querySelector("#editor").addEventListener("submit", renderVideo);
  if (state.staticDemo) {
    workspace.querySelector("#save-preset").disabled = true;
    workspace.querySelector("#render").disabled = true;
    workspace.querySelector("#status").textContent = "在线可切换风格、修改内容并实时预览；下载重新生成的视频需要在本地运行。";
  }
  function refreshDirectorRenderState() {
    if (!planEdit || !scene || state.staticDemo) return;
    const audit = directorAudit(scene);
    const button = workspace.querySelector("#render");
    const readiness = workspace.querySelector(".director-readiness");
    if (button) { button.disabled = !audit.ready; button.textContent = audit.ready ? "生成草稿" : "先补齐导演说明"; }
    if (readiness) { readiness.className = `director-readiness ${audit.ready ? "ready" : "missing"}`; readiness.textContent = audit.ready ? "可以渲染" : "需要补充"; }
  }
  refreshDirectorRenderState();
  mountLivePreview();
  workspace.querySelector("#back-to-plan")?.addEventListener("click", renderPlanWorkspace);
}

function updateNav() {
  document.body.dataset.view = state.view;
  showLibrary.classList.toggle("active", state.view === "library");
  showPlan.classList.toggle("active", state.view === "plan" || state.view === "plan-edit");
  showGuide.classList.toggle("active", state.view === "guide");
}

function renderGuide() {
  disconnectPreview();
  state.view = "guide";
  updateNav();
  workspace.innerHTML = `
    <section class="guide">
      <div class="guide-hero">
        <p class="kicker">OPEN SOURCE MOTION SYSTEM</p>
        <h2>把这套动效系统，长成你自己的模板库</h2>
        <p>这是 <strong>栗噔噔</strong> 做的开源视频动效系统。你可以克隆项目，改文案和数据生成动效，也可以让自己的 Agent 继续往 <code>templates/</code> 里添加新模板，长成属于自己的动效库。</p>
        <div class="creator-strip" aria-label="作者账号">
          <span>全平台同名：</span>
          <span class="creator-chip">小红书</span>
          <span class="creator-chip">抖音</span>
          <span class="creator-chip">视频号</span>
          <span class="creator-chip">公众号</span>
          <span class="creator-chip">B站</span>
          <span class="creator-chip">X</span>
          <span class="creator-chip">YouTube</span>
          <span class="creator-chip">即刻</span>
          <span class="creator-chip">栗噔噔</span>
        </div>
        <div class="star-callout">如果这个项目对你有启发，欢迎关注 <strong>栗噔噔</strong>，也欢迎去 <a href="${GITHUB_REPO}" target="_blank" rel="noreferrer">GitHub 项目</a> 点一个 <strong>Star</strong>，让更多做视频的人看到这套工作流。</div>
      </div>
      <div class="guide-grid">
        <article class="guide-card wide">
          <div class="guide-card-top"><strong>RECOMMENDED</strong><button class="button guide-copy" type="button" data-copy-prompt="install">复制提示词</button></div>
          <h3>让 Agent 自动安装</h3>
          <p>如果你不想自己敲命令，直接把下面这段话复制给自己的 Agent。让它帮你克隆项目、安装依赖、启动本地服务。</p>
          <pre class="guide-prompt">${escapeHtml(AGENT_INSTALL_PROMPT)}</pre>
        </article>
        <article class="guide-card">
          <strong>STEP 01</strong>
          <h3>手动安装</h3>
          <p>如果你熟悉命令行，也可以自己把项目克隆到电脑，然后进入目录安装依赖。</p>
          <pre>git clone ${GITHUB_REPO}.git
cd hyperframes-motion-library
npm install</pre>
        </article>
        <article class="guide-card">
          <strong>STEP 02</strong>
          <h3>本地启动和渲染</h3>
          <p>本地启动后可以改参数、看预览、生成视频。渲染会调用本机的 Chrome / FFmpeg，所以算力成本由自己的电脑承担。</p>
          <pre>npm run dev
npm run check
npm run render -- metric-pulse templates/metric-pulse/presets/default.json</pre>
        </article>
        <article class="guide-card wide">
          <strong>STEP 03</strong>
          <h3>让 Agent 继续加动效</h3>
          <p>把整个文件夹交给自己的 Agent，让它先读项目规范，再按同样结构新增模板。</p>
          <ol>
            <li>先读 <code>README.md</code>，理解系统怎么运行。</li>
            <li>再读 <code>SYSTEM.md</code>，理解一个模板必须包含什么。</li>
            <li>参考已有 <code>templates/&lt;id&gt;/</code> 目录，新增自己的动效。</li>
            <li>更新 <code>catalog.json</code>，让新模板出现在展示站里。</li>
            <li>运行检查，确认模板可以被复用。</li>
          </ol>
        </article>
        <article class="guide-card wide">
          <strong>STYLE</strong>
          <h3>先选画风，让一条视频保持一致</h3>
          <p>在模板右侧选择黑橙经典、纸感编辑、手绘笔记或几何构成，可以立即预览同一份内容的不同画风。生成视频前，再选择纯色 MP4 或透明 MOV。</p>
          <p>一条视频有多个动效时，在批量工作台选择“整片统一风格”。让 Agent 生成 V1.2 方案，并在顶层填写 <code>styleId</code>；所有任务默认跟随，只有明确需要转变画风的场景才单独指定。</p>
        </article>
        <article class="guide-card wide">
          <strong>AGENT PROMPT</strong>
          <h3>可以直接复制给 Agent 的任务描述</h3>
          <pre class="guide-prompt">请先阅读这个项目的 README.md、SYSTEM.md 和 director-rules.json，然后检查 catalog.json 与 templates/ 目录。
我要你基于现有结构新增一个可复用的视频动效模板：
1. 在 templates/&lt;template-id&gt;/ 下创建 index.html、design.md、meta.json、presets/default.json、package.json。
2. 动效必须使用 HyperFrames 的 data-composition-variables 暴露可编辑文案、数字和颜色。
3. 默认配色沿用黑色背景 + 橙色强调，不要引入蓝绿色系。
4. 先完成最完整时刻的静态布局，再加入确定性的 GSAP 动画。
5. 不要添加与表达无关的英文标签、时间、状态或模板编号；编号只有在表达真实步骤、顺序和排名时使用。
6. 在 catalog.json 的 director 中登记画面模式、主体选择器、占用目标和导演规则。独立全屏主体必须填满安全区，只有透明叠加才为人物和字幕预留位置。
7. 更新 catalog.json，让模板出现在展示站。
8. 阅读 styles/README.md，运行 npm run sync:styles 接入所有画风。
9. 运行 npm run check 与 npm run check:styles，通过结构、画面占用与风格检查，并尽量为新模板生成 sample 预览。
10. 不要破坏已有模板和已有预设。</pre>
        </article>
        <article class="guide-card wide">
          <div class="guide-card-top"><strong>NEW STYLE</strong><button class="button guide-copy" type="button" data-copy-prompt="style">复制提示词</button></div>
          <h3>让 Agent 继续扩展画风</h3>
          <p>想加入自己的品牌、纸张或插画视觉时，把下面的任务和参考图一起交给 Agent，新画风就可以被整套模板反复调用。</p>
          <pre class="guide-prompt">${escapeHtml(AGENT_STYLE_PROMPT)}</pre>
        </article>
      </div>
    </section>`;
  workspace.querySelector("[data-copy-prompt='install']")?.addEventListener("click", async (event) => {
    await navigator.clipboard.writeText(AGENT_INSTALL_PROMPT);
    event.currentTarget.textContent = "已复制";
    setTimeout(() => { event.currentTarget.textContent = "复制提示词"; }, 1600);
  });
  workspace.querySelector("[data-copy-prompt='style']")?.addEventListener("click", async (event) => {
    await navigator.clipboard.writeText(AGENT_STYLE_PROMPT);
    event.currentTarget.textContent = "已复制";
    setTimeout(() => { event.currentTarget.textContent = "复制提示词"; }, 1600);
  });
  workspace.scrollTo({ top: 0, behavior: "smooth" });
}

function planStatusLabel(scene) {
  if (scene.status === "complete") return "已完成";
  if (scene.status === "running") return "渲染中";
  if (scene.status === "failed") return "失败";
  return "待渲染";
}

function planSceneMarkup(scene, index) {
  const template = templateById(scene.templateId);
  const audit = directorAudit(scene);
  const mode = layoutModeMeta(scene.director.layoutMode);
  return `
    <article class="plan-scene ${scene.status}" data-scene-id="${escapeAttribute(scene.id)}">
      <div class="plan-scene-order">${String(index + 1).padStart(2, "0")}</div>
      <div class="plan-scene-content">
        <div class="plan-scene-heading">
          <div><span class="plan-timecode">${escapeHtml(scene.timecode)}</span><strong>${escapeHtml(template.name)}</strong></div>
          <span class="plan-status ${scene.status}">${planStatusLabel(scene)}</span>
        </div>
        ${scene.note ? `<p class="plan-note">${escapeHtml(scene.note)}</p>` : ""}
        <section class="director-card ${audit.ready ? "ready" : "missing"}">
          <div class="director-card-heading"><div><span class="director-mode">${escapeHtml(mode.label)}</span><strong>${escapeHtml(scene.director.intent || "表达目的待补")}</strong></div><span>${audit.ready ? "导演信息完整" : `缺少 ${audit.errors.length} 项`}</span></div>
          <p><b>原始口播</b>${escapeHtml(scene.director.sourceQuote || "待补充")}</p>
          <div class="director-columns"><p><b>必须出现</b>${scene.director.requiredInformation.length ? scene.director.requiredInformation.map(escapeHtml).join(" · ") : "待补充"}</p><p><b>禁止添加</b>${scene.director.forbiddenInformation.length ? scene.director.forbiddenInformation.map(escapeHtml).join(" · ") : "待补充"}</p></div>
          ${audit.errors.map((item) => `<p class="director-audit-error">需要补充：${escapeHtml(item)}</p>`).join("")}
          ${audit.warnings.map((item) => `<p class="director-audit-warning">检查一下：${escapeHtml(item)}</p>`).join("")}
        </section>
        <p class="plan-summary">${escapeHtml(sceneSummary(scene))}</p>
        <div class="plan-scene-meta"><span class="scene-style-label">${scene.styleId ? "单独风格" : "跟随整片"} · ${escapeHtml(styleById(effectiveSceneStyle(scene)).name)}</span><span>${scene.format.toUpperCase()}</span><span>${scene.orientation === "portrait" ? "竖屏 9:16" : "横屏 16:9"}</span><span>${variantDuration(template, scene.orientation)}s</span><span>${escapeHtml(scene.templateId)}</span><span>铺开 ${Math.round(template.director.measuredSpan.width * 100)}×${Math.round(template.director.measuredSpan.height * 100)}%</span><span class="${template.director.layoutStatus === "needs-redesign" ? "needs-redesign" : ""}">${template.director.layoutStatus === "needs-redesign" ? "需要重构" : "布局通过"}</span></div>
        ${scene.error ? `<p class="plan-error">${escapeHtml(scene.error)}</p>` : ""}
        ${scene.output ? `<a class="plan-output" href="${assetUrl(scene.output)}" download>下载这条视频</a>` : ""}
      </div>
      <div class="plan-scene-actions">
        <button class="button" type="button" data-action="edit" title="修改文案和数据">编辑</button>
        <button class="button compact" type="button" data-action="up" title="上移" ${index === 0 ? "disabled" : ""}>↑</button>
        <button class="button compact" type="button" data-action="down" title="下移" ${index === state.plan.scenes.length - 1 ? "disabled" : ""}>↓</button>
        <button class="button compact danger" type="button" data-action="remove" title="移除">×</button>
      </div>
    </article>`;
}

function renderPlanWorkspace() {
  disconnectPreview();
  state.view = "plan";
  state.activeSceneId = null;
  updateNav();
  const plan = state.plan;
  const audit = plan ? planAudit() : null;
  workspace.innerHTML = `
    <section class="plan-workspace">
      <div class="plan-hero">
        <div>
          <p class="kicker">AGENT TO MOTION QUEUE</p>
          <h2>先理解口播，再开始做动效</h2>
          <p>为整片选好统一风格，再确认每条动效的口播依据、表达目的和信息边界，一次生成可重复调用的素材。</p>
        </div>
        <div class="plan-hero-actions">
          <button class="button" type="button" id="copy-plan-prompt">复制给 Agent 的提示词</button>
          <button class="button primary" type="button" id="import-plan">${plan ? "重新导入方案" : "导入动效方案"}</button>
          <input type="file" id="plan-file" accept="application/json,.json" hidden />
        </div>
      </div>
      ${plan ? `
        ${styleChooserMarkup(plan.styleId, "project")}
        <div class="plan-toolbar">
          <div class="plan-project-field"><label for="plan-project">项目名称</label><input id="plan-project" value="${escapeAttribute(plan.project)}" /></div>
          <div class="plan-metrics"><strong>${plan.scenes.length}</strong><span>条动效任务</span><strong>${plan.scenes.filter((scene) => scene.status === "complete").length}</strong><span>条已完成</span></div>
          <div class="plan-toolbar-actions">
            <button class="button" type="button" id="download-plan">导出方案</button>
            <button class="button" type="button" id="open-plan-folder" ${state.staticDemo ? "disabled" : ""}>打开输出目录</button>
            <button class="button primary" type="button" id="render-plan" ${state.staticDemo || state.batchRunning || !audit.ready ? "disabled" : ""}>${state.batchRunning ? "正在批量渲染…" : audit.ready ? "批量渲染" : "先补齐导演说明"}</button>
          </div>
        </div>
        <div class="plan-progress" aria-live="polite"><span style="width:${plan.scenes.length ? plan.scenes.filter((scene) => scene.status === "complete").length / plan.scenes.length * 100 : 0}%"></span></div>
        <div class="plan-audit-summary ${audit.ready ? "ready" : "missing"}"><div><strong>${audit.readyCount} / ${plan.scenes.length}</strong><span>条通过导演检查</span></div><p>${audit.ready ? "所有任务都有口播依据、表达目的和信息边界，可以开始批量渲染。" : `还有 ${audit.errorCount} 项导演信息需要补充。旧版方案可以继续导入，但补齐后才允许批量渲染。`}${audit.warningCount ? ` 另外有 ${audit.warningCount} 条内容提醒。` : ""}</p></div>
        ${state.staticDemo ? `<p class="plan-local-note">在线演示可以导入和检查方案；批量渲染需要在本地运行项目。</p>` : ""}
        <div class="plan-scenes">${plan.scenes.map(planSceneMarkup).join("")}</div>
        <p class="status" id="plan-message"></p>
      ` : `
        <div class="plan-empty" id="plan-dropzone">
          <div class="plan-empty-icon">↥</div>
          <h3>导入 Agent 生成的 motion-plan.json</h3>
          <p>系统会检查模板 ID、变量类型、画面模式和导演说明；旧版方案也能导入，但需要补齐信息后再渲染。</p>
          <div class="plan-empty-actions">
            <button class="button primary" type="button" id="empty-import-plan">选择 JSON 文件</button>
            <a class="button nav-link" href="./examples/motion-plan.example.json" download>下载示例</a>
          </div>
        </div>
        <div class="plan-prompt-card">
          <div class="guide-card-top"><strong>AGENT PROMPT</strong><button class="button guide-copy" type="button" id="copy-plan-prompt-bottom">复制提示词</button></div>
          <pre>${escapeHtml(AGENT_PLAN_PROMPT)}</pre>
        </div>
      `}
    </section>`;

  const fileInput = workspace.querySelector("#plan-file");
  const chooseFile = () => fileInput.click();
  workspace.querySelector("#import-plan")?.addEventListener("click", chooseFile);
  workspace.querySelector("#empty-import-plan")?.addEventListener("click", chooseFile);
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (file) await importMotionPlanFile(file);
  });
  const copyPrompt = async (button) => {
    await navigator.clipboard.writeText(AGENT_PLAN_PROMPT);
    const original = button.textContent;
    button.textContent = "已复制";
    setTimeout(() => { button.textContent = original; }, 1600);
  };
  workspace.querySelector("#copy-plan-prompt")?.addEventListener("click", (event) => copyPrompt(event.currentTarget));
  workspace.querySelector("#copy-plan-prompt-bottom")?.addEventListener("click", (event) => copyPrompt(event.currentTarget));

  const dropzone = workspace.querySelector("#plan-dropzone");
  dropzone?.addEventListener("dragover", (event) => { event.preventDefault(); dropzone.classList.add("dragging"); });
  dropzone?.addEventListener("dragleave", () => dropzone.classList.remove("dragging"));
  dropzone?.addEventListener("drop", async (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragging");
    const file = event.dataTransfer.files?.[0];
    if (file) await importMotionPlanFile(file);
  });

  if (!plan) return;
  workspace.querySelectorAll('[data-style-scope="project"]').forEach((button) => button.addEventListener("click", () => {
    if (state.batchRunning || button.dataset.styleId === plan.styleId) return;
    plan.styleId = requireStyleId(button.dataset.styleId);
    plan.scenes.filter((scene) => !scene.styleId).forEach((scene) => {
      scene.variables = applyStyleValues(templateById(scene.templateId), scene.variables, plan.styleId);
      scene.status = "pending"; scene.error = null; scene.output = null; scene.preview = null;
    });
    renderPlanWorkspace();
  }));
  workspace.querySelector("#plan-project").addEventListener("input", (event) => { state.plan.project = event.target.value; });
  workspace.querySelector("#download-plan").addEventListener("click", downloadMotionPlan);
  workspace.querySelector("#open-plan-folder").addEventListener("click", revealPlanFolder);
  workspace.querySelector("#render-plan").addEventListener("click", renderMotionPlan);
  workspace.querySelectorAll(".plan-scene").forEach((card) => {
    const sceneId = card.dataset.sceneId;
    card.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => handlePlanSceneAction(sceneId, button.dataset.action)));
  });
  workspace.scrollTo({ top: 0, behavior: "smooth" });
}

async function importMotionPlanFile(file) {
  try {
    const raw = JSON.parse(await file.text());
    state.plan = normalizeMotionPlan(raw);
    state.activeSceneId = null;
    renderPlanWorkspace();
    const message = workspace.querySelector("#plan-message");
    if (message) {
      const audit = planAudit();
      message.textContent = audit.ready
        ? `方案检查通过：${state.plan.scenes.length} 条动效任务均已具备导演说明。`
        : `已导入 ${state.plan.scenes.length} 条动效任务，其中 ${audit.readyCount} 条通过导演检查；请编辑其余任务补充口播依据和信息边界。`;
    }
  } catch (error) {
    alert(`导入失败：${error.message}`);
  }
}

function handlePlanSceneAction(sceneId, action) {
  const index = state.plan.scenes.findIndex((scene) => scene.id === sceneId);
  if (index < 0 || state.batchRunning) return;
  if (action === "edit") {
    previewRevision += 1;
    const scene = state.plan.scenes[index];
    state.activeSceneId = scene.id;
    state.selected = templateById(scene.templateId);
    state.values = { ...scene.variables };
    state.format = scene.format;
    state.orientation = scene.orientation === "portrait" && hasPortrait(state.selected) ? "portrait" : "landscape";
    state.output = scene.output || null;
    state.previewOutput = scene.preview || scene.output || null;
    renderList(search.value);
    renderWorkspace({ planEdit: true });
    workspace.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  if (action === "remove") {
    state.plan.scenes.splice(index, 1);
    if (!state.plan.scenes.length) state.plan = null;
  } else if (action === "up" && index > 0) {
    [state.plan.scenes[index - 1], state.plan.scenes[index]] = [state.plan.scenes[index], state.plan.scenes[index - 1]];
  } else if (action === "down" && index < state.plan.scenes.length - 1) {
    [state.plan.scenes[index + 1], state.plan.scenes[index]] = [state.plan.scenes[index], state.plan.scenes[index + 1]];
  }
  renderPlanWorkspace();
}

function downloadMotionPlan() {
  const blob = new Blob([JSON.stringify(serializablePlan(), null, 2) + "\n"], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${state.plan.project || "motion-plan"}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function sceneOutputName(scene, index) {
  return `${String(index + 1).padStart(2, "0")}-${scene.timecode.replaceAll(":", "-")}-${scene.templateId}`;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function renderPlanScene(scene, index) {
  const audit = directorAudit(scene);
  if (!audit.ready) throw new Error(`导演检查未通过：${audit.errors.join("；")}`);
  scene.status = "running";
  scene.error = null;
  if (state.view === "plan") renderPlanWorkspace();
  const job = await api("/api/render", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      templateId: scene.templateId,
      variables: scene.variables,
      quality: "draft",
      format: scene.format,
      orientation: scene.orientation,
      styleId: effectiveSceneStyle(scene),
      project: state.plan.project,
      outputName: sceneOutputName(scene, index)
    })
  });
  while (true) {
    await wait(1200);
    const current = await api(`/api/jobs/${job.id}`);
    if (current.status === "running") continue;
    if (current.status === "failed") throw new Error(current.log?.trim().split("\n").pop() || "HyperFrames 渲染失败");
    scene.status = "complete";
    scene.output = current.output;
    scene.preview = current.preview || current.output;
    return current;
  }
}

async function persistMotionPlan() {
  if (state.staticDemo || !state.plan) return;
  await api("/api/plans", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan: serializablePlan() })
  });
}

async function renderMotionPlan() {
  if (state.staticDemo || state.batchRunning || !state.plan) return;
  const audit = planAudit();
  if (!audit.ready) {
    const message = workspace.querySelector("#plan-message");
    if (message) { message.className = "status error"; message.textContent = `还有 ${audit.errorCount} 项导演信息需要补充，暂不开始批量渲染。`; }
    return;
  }
  state.batchRunning = true;
  state.plan.scenes.forEach((scene) => { scene.status = "pending"; scene.error = null; });
  renderPlanWorkspace();
  let finalMessage = "";
  let finalFailed = false;
  try {
    await persistMotionPlan();
    for (const [index, scene] of state.plan.scenes.entries()) {
      try {
        await renderPlanScene(scene, index);
      } catch (error) {
        scene.status = "failed";
        scene.error = error.message;
      }
      renderPlanWorkspace();
    }
    await persistMotionPlan();
    const failed = state.plan.scenes.filter((scene) => scene.status === "failed").length;
    finalFailed = failed > 0;
    finalMessage = failed ? `批量任务完成，${failed} 条渲染失败，可以编辑后重新运行。` : "全部动效已经渲染完成，并按序号和时间码保存。";
  } catch (error) {
    finalFailed = true;
    finalMessage = error.message;
  } finally {
    state.batchRunning = false;
    renderPlanWorkspace();
    const message = workspace.querySelector("#plan-message");
    if (message && finalMessage) {
      message.className = `status${finalFailed ? " error" : ""}`;
      message.textContent = finalMessage;
    }
  }
}

async function revealPlanFolder() {
  if (state.staticDemo || !state.plan) return;
  const message = workspace.querySelector("#plan-message");
  try {
    await persistMotionPlan();
    await api("/api/reveal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ project: state.plan.project }) });
    if (message) message.textContent = "已经在文件管理器中打开输出目录。";
  } catch (error) {
    if (message) { message.className = "status error"; message.textContent = error.message; }
  }
}

function selectTemplate(template) {
  previewRevision += 1;
  state.activeSceneId = null;
  state.selected = template;
  state.values = state.libraryStyleId === "classic-orange" ? { ...defaults(template), styleId: "classic-orange" } : applyStyleValues(template, defaults(template), state.libraryStyleId);
  state.format = template.defaultFormat || template.formats?.[0] || "mp4";
  state.orientation = "landscape";
  state.output = state.libraryStyleId === "classic-orange" ? template.preview || null : null;
  state.previewOutput = state.output;
  renderList(search.value);
  renderWorkspace();
  workspace.scrollTo({ top: 0, behavior: "smooth" });
}

showLibrary.addEventListener("click", () => {
  state.activeSceneId = null;
  if (state.selected) renderWorkspace();
});
showPlan.addEventListener("click", renderPlanWorkspace);
showGuide.addEventListener("click", renderGuide);

async function savePreset() {
  if (state.staticDemo) return;
  const name = prompt("给这个预设起一个名称");
  if (!name) return;
  const status = workspace.querySelector("#status");
  try {
    const saved = await api("/api/presets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ templateId: state.selected.id, name, values: state.values }) });
    const existing = state.selected.presets.findIndex((preset) => preset.id === saved.id);
    const nextPreset = { id: saved.id, values: { ...state.values } };
    if (existing >= 0) state.selected.presets.splice(existing, 1, nextPreset);
    else state.selected.presets.push(nextPreset);
    state.selected.presets.sort((a, b) => a.id === "default" ? -1 : b.id === "default" ? 1 : a.id.localeCompare(b.id, "zh-CN"));
    status.textContent = `已保存预设：${saved.id}`;
    renderList(search.value);
  } catch (error) { status.className = "status error"; status.textContent = error.message; }
}

async function renderVideo(event) {
  event.preventDefault();
  if (state.staticDemo) return;
  const status = workspace.querySelector("#status");
  const button = workspace.querySelector("#render");
  const active = activeScene();
  if (active) {
    const audit = directorAudit(active);
    if (!audit.ready) {
      status.className = "status error";
      status.textContent = `导演检查未通过：${audit.errors.join("；")}`;
      return;
    }
  }
  button.disabled = true;
  status.textContent = "正在生成草稿视频…";
  const renderRevision = previewRevision;
  const renderTemplateId = state.selected.id;
  try {
    const format = workspace.querySelector("#output-format").value;
    state.format = format;
    const scene = activeScene();
    const sceneIndex = scene ? state.plan.scenes.findIndex((item) => item.id === scene.id) : -1;
    if (scene) { scene.status = "running"; scene.error = null; scene.format = format; scene.variables = { ...state.values }; }
    const job = await api("/api/render", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        templateId: state.selected.id,
        variables: state.values,
        quality: "draft",
        format,
        orientation: state.orientation,
        styleId: state.values.styleId || "classic-orange",
        ...(scene ? { project: state.plan.project, outputName: sceneOutputName(scene, sceneIndex) } : {})
      })
    });
    const timer = setInterval(async () => {
      const current = await api(`/api/jobs/${job.id}`);
      if (current.status === "running") {
        status.textContent = current.phase === "converting" ? "视频已渲染，正在转换透明 MOV…" : "正在渲染视频画面…";
        return;
      }
      clearInterval(timer);
      button.disabled = false;
      if (current.status === "failed") {
        if (scene) { scene.status = "failed"; scene.error = "渲染失败，请查看启动系统的终端信息。"; }
        status.className = "status error";
        status.textContent = "渲染失败，请查看启动系统的终端信息。";
        return;
      }
      if (renderRevision !== previewRevision || renderTemplateId !== state.selected.id) return;
      state.output = current.output;
      state.previewOutput = current.preview || current.output;
      if (scene) { scene.status = "complete"; scene.output = current.output; scene.preview = current.preview || current.output; persistMotionPlan().catch(() => {}); }
      status.textContent = "草稿已生成。";
      refreshPreview();
    }, 1200);
  } catch (error) {
    const scene = activeScene();
    if (scene) { scene.status = "failed"; scene.error = error.message; }
    button.disabled = false;
    status.className = "status error";
    status.textContent = error.message;
  }
}

search.addEventListener("input", () => renderList(search.value));
state.catalog = await loadCatalog();
document.querySelector("#template-count").textContent = state.catalog.templates.filter((template) => template.status === "ready").length;
renderCategoryFilters();
renderList();
const initialTemplate = state.catalog.templates.find((template) => template.status === "ready" && template.preview) || state.catalog.templates[0];
if (initialTemplate) selectTemplate(initialTemplate);
