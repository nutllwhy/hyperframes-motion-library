# 视频动效系统

这是一套以 HyperFrames 为渲染内核的本地动效资产库。每个动效都是一个可独立预览、校验和渲染的模板；文案、数字、颜色等可变内容通过参数传入，不需要改动动画源码。

## 作者

这个项目由 **栗噔噔** 创建。

小红书、抖音、视频号、公众号、B站、X、YouTube、即刻都是同一个 ID：**栗噔噔**。

如果这个项目对你有帮助，欢迎关注 **栗噔噔**，也欢迎给这个 GitHub 项目点一个 Star，让更多做视频的人看到这套工作流：

https://github.com/nutllwhy/hyperframes-motion-library

## 在线演示

GitHub Pages 演示页：

https://nutllwhy.github.io/hyperframes-motion-library/

演示页可以查看模板库、使用指引和每个动效的样片。因为 GitHub Pages 只能托管静态页面，在线演示页不负责云端渲染；如果要修改文案、数据并生成新视频，请克隆项目到本地运行。

## 项目能力

这套系统的重点不是一次性做出某条视频，而是把常用的视频动效沉淀成可以继续复用、继续扩展的模板资产。

- 模板化：每个动效都有独立源码、默认预设、设计说明和目录登记。
- 参数化：标题、数字、说明文字、颜色等常改内容都可以通过数据传入。
- 可扩展：新的动效可以按 `SYSTEM.md` 的规范继续加入模板库，也可以交给 Agent 辅助迭代。

## 使用

```bash
git clone https://github.com/nutllwhy/hyperframes-motion-library.git
cd hyperframes-motion-library
npm install
npm run dev
```

打开终端显示的地址，在模板库里修改参数，然后保存为预设或生成草稿视频。

常用检查：

```bash
npm run check
npm run check:templates
```

命令行渲染：

```bash
npm run render -- metric-pulse templates/metric-pulse/presets/default.json
```

## 本地渲染

视频渲染会调用 Chrome / FFmpeg / HyperFrames，算力成本主要发生在渲染阶段。建议克隆到自己的电脑后，用本地资源生成视频。

## 用 Agent 继续扩展

如果你想让自己的 Agent 继续往系统里加动效，请把整个项目文件夹交给 Agent，并让它先阅读：

1. `README.md`
2. `SYSTEM.md`
3. `AGENT_GUIDE.md`
4. `catalog.json`
5. `templates/` 下已有模板

更多提示词和入库要求见 `AGENT_GUIDE.md`。如果你基于这个项目长出了自己的动效库，也欢迎回到原项目点 Star 支持一下：

https://github.com/nutllwhy/hyperframes-motion-library

## 系统结构

- `catalog.json`：所有动效模板的目录与检索信息
- `templates/<id>/index.html`：HyperFrames 动效源码
- `templates/<id>/presets/*.json`：同一动效的文案/数据预设
- `app/`：模板库与参数编辑界面
- `renders/`：界面或命令行生成的视频
- `SYSTEM.md`：新增截图动效时的入库规范

当前模板库已经覆盖数据可视化、透明叠加和知识讲解三类动效。发布前的模板盘点见 `references/上线前模板盘点.md`。

之后每次新增动效，都沿用“模板源码 + 变量声明 + 默认预设 + 目录登记 + 校验”的结构，系统会自然长成可搜索、可复用的动效库。
