# 三步流程视觉规范

独立全屏知识动效，用于讲方法、步骤、SOP、教程流程。

## Palette

- Foreground: `#F5F5F2`
- Accent: `#FF5A1F`（左上短横线、步骤序号、进度轨道填充）
- Muted: `#9A9A9A`（步骤说明）
- 轨道: `rgba(245,245,242,.12)` 3px
- 无卡片底：透明导出时画布完全透明，MP4 导出底色 `#0D0D0D`

## Typography

- 字体栈：`"PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`，`-webkit-font-smoothing: antialiased`
- 标题 84px / 800，步骤词 64px / 800，序号 36px / 700（`tabular-nums`），说明 36px / 500，字距 0

## Rules

- 三个步骤共同铺满画面安全区，不再以局部小卡片悬在画面中央。
- 步骤词要短，说明控制在一到两行，适合配合口播展开讲。
- 步骤上方一条横向轨道，橙色填充由左到右生长，形成“已经走完这条路径”的感觉。

## Motion

- 0.12s 左上 160px×8px 短横线生长（`power3.inOut`）→ 标题遮罩上推（`expo.out` 0.65s）
- 0.6s 灰色轨道生长；0.8s 起橙色填充用 1.3s 走完全程（`power3.inOut`）
- 0.9s 起每 0.36s 一步：序号淡入 → 步骤词遮罩上推 → 说明淡入上移 12px
- 5.42s 整体向右擦出（`clipPath`，`power3.in` 0.4s）
