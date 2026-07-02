const state = { catalog: null, selected: null, values: {}, output: null, view: "library", staticDemo: false };
const list = document.querySelector("#template-list");
const workspace = document.querySelector("#workspace");
const cardTemplate = document.querySelector("#template-card");
const search = document.querySelector("#search");
const showLibrary = document.querySelector("#show-library");
const showGuide = document.querySelector("#show-guide");
const GITHUB_REPO = "https://github.com/nutllwhy/hyperframes-motion-library";

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
    const response = await fetch("./catalog.static.json");
    if (!response.ok) throw new Error("静态演示目录读取失败");
    return response.json();
  }
}

function assetUrl(value) {
  if (!value) return value;
  if (/^(https?:|data:|blob:)/.test(value)) return value;
  return value.startsWith("/") ? `.${value}` : value;
}

function defaults(template) {
  return Object.fromEntries(template.schema.map((item) => [item.id, item.default]));
}

function renderList(query = "") {
  list.innerHTML = "";
  const needle = query.trim().toLowerCase();
  state.catalog.templates.filter((template) => JSON.stringify(template).toLowerCase().includes(needle)).forEach((template) => {
    const fragment = cardTemplate.content.cloneNode(true);
    const button = fragment.querySelector("button");
    button.dataset.id = template.id;
    button.classList.toggle("active", state.selected?.id === template.id);
    fragment.querySelector(".template-category").textContent = template.category;
    fragment.querySelector(".template-name").textContent = template.name;
    fragment.querySelector(".template-description").textContent = template.description;
    fragment.querySelector(".template-meta").textContent = `${template.duration}s · ${template.size}`;
    button.addEventListener("click", () => selectTemplate(template));
    list.append(fragment);
  });
}

function fieldMarkup(declaration) {
  const value = state.values[declaration.id];
  if (declaration.type === "color") {
    return `<div class="field"><label for="field-${declaration.id}-text">${declaration.label}</label><div class="color-field"><input aria-label="${declaration.label}色板" type="color" data-key="${declaration.id}" value="${value}"><input id="field-${declaration.id}-text" type="text" data-key="${declaration.id}" value="${value}"></div></div>`;
  }
  if (declaration.type === "enum") {
    const options = declaration.options.map((option) => `<option value="${option.value}" ${option.value === value ? "selected" : ""}>${option.label}</option>`).join("");
    return `<div class="field"><label for="field-${declaration.id}">${declaration.label}</label><select id="field-${declaration.id}" data-key="${declaration.id}">${options}</select></div>`;
  }
  const type = declaration.type === "number" ? "number" : "text";
  return `<div class="field"><label for="field-${declaration.id}">${declaration.label}</label><input id="field-${declaration.id}" type="${type}" data-key="${declaration.id}" value="${String(value).replaceAll('"', '&quot;')}"></div>`;
}

function renderWorkspace() {
  state.view = "library";
  updateNav();
  const template = state.selected;
  workspace.innerHTML = `
    <div class="workspace-grid">
      <div class="preview-panel">
        <div class="preview" id="preview">${state.output ? `<video src="${assetUrl(state.output)}" controls autoplay loop></video>` : `<div class="preview-placeholder"><strong>修改参数，生成第一条草稿</strong>${state.staticDemo ? "GitHub Pages 演示页只能查看样片；克隆到本地后可以修改参数并渲染新视频。" : "系统会调用 HyperFrames，把当前文案与数据渲染成可播放的视频。"}</div>`}</div>
        <h2 class="workspace-title">${template.name}</h2>
        <p class="workspace-description">${template.description}</p>
        <div class="tag-row">${template.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
      </div>
      <form class="editor" id="editor">
        <h2>内容与数据</h2>
        <div class="preset-row"><select id="preset" aria-label="载入预设"><option value="">载入预设…</option>${template.presets.map((preset) => `<option value="${preset.id}">${preset.id}</option>`).join("")}</select><button class="button" type="button" id="save-preset">保存</button></div>
        <div class="field"><label for="output-format">输出格式</label><select id="output-format">${(template.formats || ["mp4"]).map((format) => `<option value="${format}" ${format === template.defaultFormat ? "selected" : ""}>${format === "webm" ? "透明叠加 WebM" : "普通 / 滤色 MP4"}</option>`).join("")}</select></div>
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
  }));
  workspace.querySelector("#preset").addEventListener("change", (event) => {
    const preset = template.presets.find((item) => item.id === event.target.value);
    if (preset) { state.values = { ...defaults(template), ...preset.values }; renderWorkspace(); }
  });
  workspace.querySelector("#reset").addEventListener("click", () => { state.values = defaults(template); renderWorkspace(); });
  workspace.querySelector("#save-preset").addEventListener("click", savePreset);
  workspace.querySelector("#editor").addEventListener("submit", renderVideo);
  if (state.staticDemo) {
    workspace.querySelector("#save-preset").disabled = true;
    workspace.querySelector("#render").disabled = true;
    workspace.querySelector("#status").textContent = "当前是 GitHub Pages 静态演示：可查看模板和样片；生成新视频需要克隆到本地运行。";
  }
}

function updateNav() {
  showLibrary.classList.toggle("active", state.view === "library");
  showGuide.classList.toggle("active", state.view === "guide");
}

function renderGuide() {
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
        <article class="guide-card">
          <strong>STEP 01</strong>
          <h3>下载到本地</h3>
          <p>把项目克隆到自己的电脑，然后进入目录安装依赖。展示站里看到的每个动效，都对应一个独立模板文件夹。</p>
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
          <strong>AGENT PROMPT</strong>
          <h3>可以直接复制给 Agent 的任务描述</h3>
          <pre class="guide-prompt">请先阅读这个项目的 README.md 和 SYSTEM.md，然后检查 catalog.json 与 templates/ 目录。
我要你基于现有结构新增一个可复用的视频动效模板：
1. 在 templates/&lt;template-id&gt;/ 下创建 index.html、design.md、meta.json、presets/default.json、package.json。
2. 动效必须使用 HyperFrames 的 data-composition-variables 暴露可编辑文案、数字和颜色。
3. 默认配色沿用黑色背景 + 橙色强调，不要引入蓝绿色系。
4. 先完成最完整时刻的静态布局，再加入确定性的 GSAP 动画。
5. 更新 catalog.json，让模板出现在展示站。
6. 运行 npm run check，并尽量为新模板生成 sample 预览。
7. 不要破坏已有模板和已有预设。</pre>
        </article>
      </div>
    </section>`;
  workspace.scrollTo({ top: 0, behavior: "smooth" });
}

function selectTemplate(template) {
  state.selected = template;
  state.values = defaults(template);
  state.output = template.preview || null;
  renderList(search.value);
  renderWorkspace();
  workspace.scrollTo({ top: 0, behavior: "smooth" });
}

showLibrary.addEventListener("click", () => {
  if (state.selected) renderWorkspace();
});
showGuide.addEventListener("click", renderGuide);

async function savePreset() {
  if (state.staticDemo) return;
  const name = prompt("给这个预设起一个名称");
  if (!name) return;
  const status = workspace.querySelector("#status");
  try {
    const saved = await api("/api/presets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ templateId: state.selected.id, name, values: state.values }) });
    status.textContent = `已保存预设：${saved.id}`;
  } catch (error) { status.className = "status error"; status.textContent = error.message; }
}

async function renderVideo(event) {
  event.preventDefault();
  if (state.staticDemo) return;
  const status = workspace.querySelector("#status");
  const button = workspace.querySelector("#render");
  button.disabled = true;
  status.textContent = "正在生成草稿视频…";
  try {
    const format = workspace.querySelector("#output-format").value;
    const job = await api("/api/render", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ templateId: state.selected.id, variables: state.values, quality: "draft", format }) });
    const timer = setInterval(async () => {
      const current = await api(`/api/jobs/${job.id}`);
      if (current.status === "running") return;
      clearInterval(timer);
      button.disabled = false;
      if (current.status === "failed") { status.className = "status error"; status.textContent = "渲染失败，请查看启动系统的终端信息。"; return; }
      state.output = current.output;
      status.textContent = "草稿已生成。";
      document.querySelector("#preview").innerHTML = `<video src="${assetUrl(current.output)}" controls autoplay loop></video>`;
    }, 1200);
  } catch (error) { button.disabled = false; status.className = "status error"; status.textContent = error.message; }
}

search.addEventListener("input", () => renderList(search.value));
state.catalog = await loadCatalog();
document.querySelector("#template-count").textContent = state.catalog.templates.filter((template) => template.status === "ready").length;
renderList();
const initialTemplate = state.catalog.templates.find((template) => template.status === "ready" && template.preview) || state.catalog.templates[0];
if (initialTemplate) selectTemplate(initialTemplate);
