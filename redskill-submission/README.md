# RedSkill 投稿版｜视频动效系统

这是给小红书 RedSkill 投稿准备的轻量源码包。

完整项目请从 GitHub 下载：

https://github.com/nutllwhy/hyperframes-motion-library

在线演示页：

https://nutllwhy.github.io/hyperframes-motion-library/

作者：**栗噔噔**

小红书、抖音、视频号、公众号、B站、X、YouTube、即刻都是同一个 ID：**栗噔噔**。

## 这个项目是什么

这不是单个视频工程，而是一套可以持续生长的视频动效系统。

它把常见的视频动效抽象成可复用模板：每个模板都有独立源码、默认数据、变量声明和目录登记。你可以修改文案、数字、颜色，生成新的视频动效；也可以让自己的 Agent 阅读项目规范，继续往系统里添加新模板。

## 为什么这个投稿包是轻量版

RedSkill 新支持的格式主要是文本、代码和数据文件，例如 `.md`、`.html`、`.css`、`.js`、`.json` 等。

为了让 RedSkill 更容易读取和理解，这个目录只保留核心源码与说明，不包含 `.mp4`、`.webm`、`.png`、`.jpg` 等媒体素材。

如果你想看完整视频样片，请打开在线演示页；如果你想本地渲染新视频，请从 GitHub 克隆完整项目。

## 推荐体验路径

1. 先看 `PROJECT_OVERVIEW.md`，理解项目结构。
2. 再看 `SYSTEM.md`，理解一个动效模板怎么入库。
3. 打开 `catalog.json`，看现在有哪些模板。
4. 进入 `templates/` 下任意模板，查看 `index.html` 和 `presets/default.json`。
5. 如果要继续扩展，复制 `AGENT_PROMPT.md` 里的提示词给自己的 Agent。

## GitHub 下载

```bash
git clone https://github.com/nutllwhy/hyperframes-motion-library.git
cd hyperframes-motion-library
npm install
npm run dev
```

打开本地服务后，可以修改参数并渲染草稿视频。

## 这个投稿包里有什么

- `PROJECT_OVERVIEW.md`：给 RedSkill 和读者看的结构速览。
- `README_GITHUB.md`：完整项目的原始 README。
- `SYSTEM.md`：动效资产入库规范。
- `AGENT_GUIDE.md`：让 Agent 继续加动效的指南。
- `AGENT_PROMPT.md`：可以直接复制给 Agent 的提示词。
- `catalog.json`：去掉媒体依赖后的模板目录。
- `app/`：本地模板库界面源码。
- `scripts/`：已改成 `.js` 后缀的本地工具脚本。
- `templates/`：14 个动效模板的源码、设计说明和默认数据。
