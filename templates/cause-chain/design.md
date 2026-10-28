# 因果链路视觉规范

透明叠加型知识动效，用于解释“为什么会这样”的三段因果关系。

## Palette

- 承载卡: `rgba(20,20,20,.94)`，圆角 6px，无描边无阴影（MP4 导出底色 `#0D0D0D`）
- Foreground: `#F5F5F2`
- Accent: `#FF5A1F`
- Muted: `#9A9A9A`（「原因 / 机制 / 结果」小标签）
- 轨道: Foreground 16% 透明度；进度填充与箭头为 Accent 实色

## Typography

- 字体栈：`"PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`，`-webkit-font-smoothing: antialiased`
- 标题 56px / 800，正文 44px / 700，标签 26px / 600，字距均为 0
- 结果一栏正文使用 Accent 色

## Rules

- 三栏沿一条水平轨道排开，每栏顶部一个圆点节点，轨道末端为实色三角箭头，表达原因到结果。
- 每段文字要短，适合配合口播继续解释。
- 默认橙色强调，不使用蓝绿系。

## Motion

- 0.1s 承载卡从左擦入（`clipPath`，`expo.out` 0.5s）；标题淡入上移（`power2.out`）
- 灰色轨道从左生长；0.8s 起每 0.72s 点亮一栏：橙色进度条推进到该节点（`power2.inOut`），圆点填充为 Accent，标签与正文淡入上移
- 2.86s 箭头淡入到位；5.06s 承载卡向右擦出（`power3.in` 0.36s）
- 不使用缩放入场或循环动画
