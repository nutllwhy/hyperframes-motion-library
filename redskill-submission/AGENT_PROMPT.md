# 给 Agent 的扩展提示词

请先阅读 README.md、SYSTEM.md、AGENT_GUIDE.md、catalog.json 和 templates/ 目录。

我要你在不破坏已有模板的前提下，新增一个可复用的视频动效模板。

要求：

1. 在 templates/<template-id>/ 下创建 index.html、design.md、meta.json、package.json、presets/default.json。
2. index.html 必须是可被 HyperFrames 渲染的完整动效。
3. 使用 data-composition-variables 暴露可编辑文案、数字、颜色和有限选项。
4. 默认视觉沿用黑色背景 + 橙色强调，不要引入蓝绿色系。
5. 先完成最完整时刻的静态布局，再加入确定性的动画。
6. 更新 catalog.json，让新模板出现在展示站。
7. 运行 npm run check，确认模板目录结构通过。
8. 不要破坏已有模板、已有预设和已有文档。

完成后请说明：新增模板适合什么视频场景、暴露了哪些变量、如何修改数据、做了哪些检查。
