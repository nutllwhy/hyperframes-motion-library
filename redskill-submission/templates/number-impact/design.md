# 极值刻度视觉规范

透明叠加层，用一个巨型关键词、一个明确百分比和一条同值竖条表达单项极值。适合湿度、完成率、增长率、覆盖率等明确的百分比指标。

## Palette

- Foreground: `#F5F5F2`
- Accent: `#FF5A1F`（短横线、百分比、单位、结论色块、竖条填充）
- Muted: `#9A9A9A`（标签）
- 背景大字: `#1C1C1C`（仅比卡片略亮，作为底纹）
- 竖条轨道: `rgba(245,245,242,.12)`
- 承载卡: `rgba(20,20,20,.94)`，940×760，圆角 6px，无描边无阴影（MP4 导出底色 `#0D0D0D`）

## Typography

- 字体栈：`"PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`，`-webkit-font-smoothing: antialiased`
- 百分比 230px / 800，`tabular-nums`；背景大字 520px / 800；标签 30px；字距 0
- 结论为橙色实色块上的深色字（`#0D0D0D`），为空时自动隐藏

## Rules

- 百分比和竖条必须表达同一个变量（0–100 截断）
- 巨型关键词最多四个汉字
- 透明画布，组件靠画面左侧放置

## Motion

- 0.12s 卡片从左擦入（`clipPath`，`expo.out` 0.5s）→ 背景大字淡入 → 短横线生长 → 标签淡入
- 0.6s 百分比淡入上移并从 0 滚动到目标值，竖条同步自下而上生长（均为 `expo.out` 1.15s，直接落定）
- 1.2s 结论色块从左擦入；4.5s 卡片向右擦出（`power3.in` 0.36s）
