# Agent 迭代指南

这个项目不是一次性视频工程，而是一套可以不断扩展的动效模板系统。

原创作者：**栗噔噔**。小红书、抖音、视频号、公众号、B站、X、YouTube、即刻都是同一个 ID：**栗噔噔**。

如果你基于这个项目做出了自己的动效库，欢迎关注 **栗噔噔**，也欢迎给原 GitHub 项目点 Star。

每个使用者都可以把它克隆到本地，让自己的 Agent 继续添加新动效，逐渐长成自己的视频动效库。

## 给 Agent 的第一句话

```text
请先阅读 README.md 和 SYSTEM.md，再检查 catalog.json 与 templates/ 目录。
我要你在不破坏已有模板的前提下，新增一个可复用的视频动效模板。
新增模板必须能通过修改文案、数字、颜色等变量复用，并登记到 catalog.json。
默认视觉请沿用黑色背景 + 橙色强调，不要引入蓝绿色系。
完成后运行 npm run check，并说明新模板的用途、变量和使用方式。
```

## Agent 应该先读哪些文件

1. `README.md`：项目怎么运行、怎么渲染。
2. `SYSTEM.md`：一个模板入库必须满足什么规范。
3. `catalog.json`：模板如何出现在模板库界面。
4. `templates/<id>/index.html`：已有模板如何声明变量、布局和动画。
5. `templates/<id>/presets/default.json`：默认数据如何组织。

## 新增模板的固定结构

```text
templates/<template-id>/
├── index.html
├── design.md
├── meta.json
├── package.json
└── presets/
    └── default.json
```

## 新模板必须做到

- `index.html` 是一个完整的 HyperFrames composition。
- `<html>` 上声明 `data-composition-variables`。
- 每个变量都有合理默认值。
- 常改内容做变量，例如标题、数字、标签、颜色。
- 不把坐标、缓动曲线、内部布局参数暴露成日常变量。
- 默认配色使用黑色背景与橙色强调。
- 动画可寻帧，不依赖随机时间、无限循环或异步构建时间线。
- 新模板登记到 `catalog.json`。
- 至少运行 `npm run check` 验证目录结构。

## 推荐新增的动效方向

- 章节标题：长视频分段，但避免 PPT 页眉感。
- 证据卡片：引用数据、来源、截图说明。
- 关键词爆破：开头钩子、段落转折。
- 局部放大镜：产品演示、教程细节。
- 风险提示：错误操作、注意事项。
- 排名卡片：Top 3 / Top 5 榜单。
- 观点对撞：正方 vs 反方、旧认知 vs 新认知。

## 完成后的检查

```bash
npm run check
npm run check:templates
```

如果只检查一个模板：

```bash
cd templates/<template-id>
npm run check
```

## 建议交付说明

Agent 完成后，应该告诉使用者：

- 新增了哪个模板。
- 这个模板适合什么视频场景。
- 暴露了哪些变量。
- 默认预览是否已经生成。
- 有哪些校验通过、有哪些警告可以接受。
