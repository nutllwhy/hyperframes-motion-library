# 概念解释卡视觉规范

透明叠加型知识动效，用于在口播视频里快速解释一个概念、术语或方法论。

## Palette

- Foreground: `#F5F5F2`（解释文字为 Foreground 88%）
- Accent: `#FF5A1F`
- Muted: `#9A9A9A`（类别标签、补充说明）
- 承载卡: `rgba(20,20,20,.94)`，圆角 6px，无描边无阴影（MP4 导出底色 `#0D0D0D`）

## Typography

- 字体栈：`"PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`，`-webkit-font-smoothing: antialiased`
- 概念名 104px / 800，解释 40px / 500，标签与说明 26px，字距 0

## Rules

- 组件为 1080px 宽的实色卡，不铺满画布，方便拖到横屏或竖屏视频上。
- 标题是“概念名”，解释文字最多两行，标签用于标记类别；补充说明默认留空，为空时自动隐藏。
- 概念名下方一条 168px×8px 橙色短横线做强调，不做 PPT 式页眉。

## Motion

- 0.12s 卡片从左擦入（`clipPath`，`expo.out` 0.5s）→ 标签淡入 → 概念名遮罩上推（`expo.out` 0.62s）
- 0.78s 短横线生长（`power3.inOut`）→ 解释文字淡入上移 12px（`power2.out`）→ 说明淡入
- 4.56s 卡片向右擦出（`power3.in` 0.36s）
