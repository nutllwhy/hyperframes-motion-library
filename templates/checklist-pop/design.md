# 清单核对视觉规范

透明叠加型知识动效，用于总结检查项、行动步骤、注意事项。

## Palette

- 承载卡: `rgba(20,20,20,.94)`，圆角 6px，无描边无阴影（MP4 导出底色 `#0D0D0D`）
- Foreground: `#F5F5F2`
- Accent: `#FF5A1F`
- 分隔线: `rgba(245,245,242,.12)`；未勾选方框描边 `rgba(245,245,242,.32)`

## Typography

- 字体栈：`"PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`，`-webkit-font-smoothing: antialiased`
- 标题 56px / 800，条目 32px / 600，字距 0

## Rules

- 卡片宽 800px，靠左放置；条目之间用细横线分隔，勾选框为 36px、圆角 4px 的小方框。
- 清单项逐条从左擦入，随后勾选框填充为 Accent、对勾变为深色，动作清楚但不做可爱化。
- 默认组件不铺满画布，适合放在口播视频侧边或下方。
- 每条文案控制在一行到两行内。

## Motion

- 0.14s 卡片从左擦入（`clipPath`，`expo.out` 0.5s）；0.32s 标题遮罩上推（`expo.out` 0.62s）
- 0.7s 起每 0.32s 擦入一条（`expo.out` 0.5s），0.34s 后勾选框直接补间填色（`ease: "none"` 0.2s）
- 4.48s 卡片向右擦出（`power3.in` 0.36s）；不做缩放入场
