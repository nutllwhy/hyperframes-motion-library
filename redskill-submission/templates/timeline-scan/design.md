# 时间线推进视觉规范

透明叠加型知识动效，用于讲演变、版本迭代、阶段变化。

## Palette

- 承载卡: `rgba(20,20,20,.94)`，1400px 宽，圆角 6px，无描边无阴影（MP4 导出底色 `#0D0D0D`）
- Foreground: `#F5F5F2`
- Accent: `#FF5A1F`（进度填充、点亮后的时间与竖线）
- Muted: `#9A9A9A`（未点亮的时间）
- 轨道: `rgba(245,245,242,.12)`；未点亮竖线 `#3A3A3A`

## Typography

- 字体栈：`"PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`，`-webkit-font-smoothing: antialiased`
- 标题 64px / 800，节点标题 40px / 600，时间 28px / 600（`tabular-nums`），字距 0

## Rules

- 时间线要像剪辑里的信息层，不像报告图表。
- 三个节点逐个点亮，最后形成完整路径。每个节点由时间、一条短竖线和标题组成。
- 节点标题短，说明句辅助口播，不承担全文解释。

## Motion

- 0.1s 卡片从左擦入（`clipPath`，`expo.out` 0.5s）→ 标题遮罩上推 → 灰色轨道生长（`power3.inOut`）
- 0.9s 起每 0.55s 点亮一个节点：橙色填充推进到节点（`power3.inOut`），时间与竖线由灰变橙（直接补间颜色），标题淡入上移
- 2.1s 填充走到末端；5.06s 卡片向右擦出（`power3.in` 0.36s）
