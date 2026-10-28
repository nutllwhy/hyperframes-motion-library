# 双数据对比视觉规范

透明叠加层，适合放在实拍、纪录片或产品画面上。使用实色深色卡承载高对比数据，视觉语气精确、克制。

## Palette

- Foreground: `#F5F5F2`（数值、结论）
- Accent: `#FF5A1F`（比较符号、结论上方短横线）
- Muted: `#9A9A9A`（标签）；单位 `#C8C8C8`
- 承载卡: `rgba(20,20,20,.94)`，1120×410，圆角 6px，无描边无阴影（MP4 导出底色 `#0D0D0D`）
- 分隔线: `rgba(245,245,242,.12)`

## Typography

- 字体栈：`"PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`，`-webkit-font-smoothing: antialiased`
- 数值 150px / 800，标签 28px / 600，结论 32px / 700，字距 0
- 数值启用 `tabular-nums`

## Rules

- 透明画布，不铺满背景；卡片位于画面下方居中
- 每个数据必须有清晰标签，比较符号必须语义明确
- 实色底只覆盖信息区域
- 不添加无含义的装饰性百分比
- 结论为空时自动隐藏

## Motion

- 0.12s 卡片从左擦入（`clipPath`，`expo.out` 0.5s）→ 标签淡入
- 左右数值依次遮罩上推并从 0 滚动到目标值（`expo.out` 0.8s，间隔 0.2s，直接落定），单位淡入上移，比较符号淡入
- 1.05s 分隔线生长 → 中央 96px×8px 橙色短横线生长 → 结论遮罩上推
- 4.56s 卡片向右擦出（`power3.in` 0.36s）
