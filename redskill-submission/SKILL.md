---
name: hyperframes-motion-library
description: 视频动效模板系统。20个可复用动效模板，支持参数化修改、Agent 动效方案导入、本地批量渲染，以及纯色底 MP4、透明 MOV 与透明 WebM 导出。
---

# 视频动效系统

这是一套由 **栗噔噔** 创建、以 HyperFrames 为渲染内核的本地视频动效资产库。

- GitHub：https://github.com/nutllwhy/hyperframes-motion-library
- 在线演示：https://nutllwhy.github.io/hyperframes-motion-library/
- 作者账号：小红书、抖音、视频号、公众号、B站、X、YouTube、即刻均为 **栗噔噔**

## Agent 使用顺序

1. 阅读 `README.md` 和 `PROJECT_OVERVIEW.md` 理解项目用途。
2. 阅读 `SYSTEM.md` 与 `AGENT_GUIDE.md` 理解模板入库规范。
3. 检查 `catalog.json` 与 `TEMPLATE_INDEX.md` 选择合适模板。
4. 为整条视频规划动效时，阅读 `motion-plan.schema.json` 和示例文件并输出可导入 JSON。
5. 修改模板预设中的文案、数字和颜色，或按规范新增模板。
6. 完整项目请从 GitHub 克隆后运行；RedSkill 投稿包主要用于理解源码和扩展方法。

## 核心能力

- 20 个模板，覆盖数据可视化、知识讲解和透明叠加。
- 每个模板包含源码、设计说明、变量声明和多场景预设。
- 默认视觉为黑色背景与橙色强调。
- 本地支持纯色底 MP4、透明 MOV 和透明 WebM。
- Agent 可以生成带时间码的动效方案，并由本地批量工作台顺序渲染。
- 新模板需要登记到 `catalog.json` 并通过项目校验。

## 本地安装

```bash
git clone https://github.com/nutllwhy/hyperframes-motion-library.git
cd hyperframes-motion-library
npm install
npm run dev
```

如需扩展模板，直接把 `AGENT_PROMPT.md` 的任务描述交给桌面端 Agent。
