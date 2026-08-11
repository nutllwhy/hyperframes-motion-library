# 柱状图增长视觉规范

## 方向

精确、编辑感的柱形数据镜头。柱形本身即是动效主体，不使用装饰性元素分散对数据的注意力。

## Palette

- Background: `#12100E`
- Foreground: `#F4EFE7`
- Accent: `#FF5A36`
- Muted: `#B8ADA2`
- Bright muted: `#D8CEC4`
- Panel: `#211C18`
- Line: `#3A3029`
- Strong line: `#5A4840`

## Typography

- 标题：`IBM Plex Mono`，字重 700，72px
- 副标题：`IBM Plex Mono`，字重 400，32px，Muted 色
- 轴标签：`IBM Plex Mono`，字重 500，18–20px
- 柱形数值：`IBM Plex Mono`，字重 700，28px
- X 轴类别标签：`IBM Plex Mono`，字重 500，24px，Muted 色

## Corners and spacing

- 画面安全边距：96px
- 柱形圆角：6px
- 柱形间距：slot 宽度的 45% 留白
- 标题与图表间距：48px
- 图表底部与 X 轴标签：28px

## Depth

仅用极细网格线（`#3A3029`）和 Y 轴刻度构建层次，不使用卡片阴影、渐变背景或光晕装饰。

## 柱形与布局

- 柱形从底部基线向上增长，transform-origin: bottom
- 每根柱形宽度占 slot 的 55%，保持呼吸感
- 数值标签紧贴柱形顶部，动画时从上方 16px 处滑入
- 柱形颜色可逐条指定，未指定时回退到 accent 色
- 最大数据值自动放大 1.15 倍作为 Y 轴上限，确保顶部不触边

## Avoid

- 不使用 3D 柱形、圆柱形或棱柱效果
- 不使用饼图、环形图替代柱形
- 不使用渐变填充柱形（纯色即可）
- 不添加柱形间连接线或折线叠加
- 不使用阴影或 glow 强调柱形
- 不引入调色板之外的新颜色

## Export modes

- 纯色 MP4 保留完整深色画布。
- 透明导出使用局部深色图表面板承载坐标、标签与柱形，面板之外保持透明。
