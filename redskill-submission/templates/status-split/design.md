# 状态对照视觉规范

独立全屏转折镜头，用于把“常规 vs 异常”“之前 vs 现在”等两种状态并列呈现。画面应像纪录片中的章节结论，而不是表格。

## Palette

- Foreground: `#F5F5F2`（右侧标题）；左侧标题 `#C8C8C8`
- Accent: `#FF5A1F`（右侧标签、右侧底线、中间箭头）
- Muted: `#9A9A9A`（左侧标签、连接词）
- 左侧底线: `rgba(245,245,242,.24)` 3px；右侧底线 Accent 8px
- 无卡片底：透明导出时画布完全透明，MP4 导出底色 `#0D0D0D`

## Typography

- 字体栈：`"PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`，`-webkit-font-smoothing: antialiased`
- 标题 140px / 800，标签 32px / 600，连接词 28px，字距 0

## Rules

- 两个状态在安全区内各占一半画面，左侧内容靠上、右侧靠下，形成明确、完整的独立镜头
- 两端标题字号相等，靠颜色与底线粗细区分前后状态，中间的连接词 + 实色箭头是视觉转折
- 标签解释状态，不额外制造指标；标签为空时自动隐藏

## Motion

- 0.15s 左侧底线生长（`expo.out`）→ 标签淡入 → 标题遮罩上推（`expo.out` 0.65s）
- 0.7s 连接词淡入，箭头从左生长（`power3.inOut` 0.5s）
- 0.95s 右侧按同样顺序出现
- 4.5s 整体向右擦出（`clipPath`，`power3.in` 0.38s）
