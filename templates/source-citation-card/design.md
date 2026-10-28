# 数据来源引用卡

用于给知识视频里的数字结论补充来源、日期和统计口径。位置偏下，适合作为口播叠加卡。

- 承载卡 `rgba(20,20,20,.94)`，1280px 宽，圆角 6px，无描边无阴影，距底 120px；MP4 导出底色 `#0D0D0D`。
- 配色：结论 `#F5F5F2`，数值 `#FF5A1F`，来源、日期与口径说明 `#9A9A9A`，来源行下方细线 `rgba(245,245,242,.12)`。
- 字体：`"PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`；数值与日期 `tabular-nums`；字距 0。口径说明为空时自动隐藏。
- 动作：卡片从左擦入（`clipPath`，`expo.out` 0.5s）→ 来源与日期淡入 → 细线从左生长 → 结论淡入上移 → 数值从 0 滚动（`power3.out` 1s）→ 说明淡入；4.5s 卡片向右擦出（`power3.in` 0.36s）。
