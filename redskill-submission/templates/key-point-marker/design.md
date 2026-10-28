# 重点标注视觉规范

透明叠加型知识动效，用于口播里突然强调一句关键判断。

## Palette

- Foreground: `#F5F5F2`
- Accent: `#FF5A1F`
- Muted: `#9A9A9A`（提示词、出处）
- 承载卡: `rgba(20,20,20,.94)`，圆角 6px，无描边无阴影（MP4 导出底色 `#0D0D0D`）

## Typography

- 字体栈：`"PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`，`-webkit-font-smoothing: antialiased`
- 主句 50px / 700，提示词与出处 24px，字距 0

## Rules

- 像视频剪辑里的高亮批注，不像讲义卡片。
- 主句必须足够大，提示词下方一条 120px×8px 橙色短横线服务于“这一句很重要”的感觉。
- 卡宽 1180px，默认位于画面下三分之一（距底 148px），不要求撑满整个视频。
- 出处默认留空，为空时自动隐藏。

## Motion

- 0.12s 卡片从左擦入（`clipPath`，`expo.out` 0.5s）→ 提示词淡入 → 短横线生长（`power3.inOut`）→ 主句遮罩上推（`expo.out` 0.65s）→ 出处淡入上移
- 4.02s 卡片向右擦出（`power3.in` 0.36s）
