# 柱状图增长视觉规范

## 方向

精确、编辑感的柱形数据镜头。柱形本身即是动效主体，不使用装饰性元素分散对数据的注意力。

## Palette

- Background: `#0D0D0D`
- Foreground: `#F5F5F2`
- Accent: `#FF5A1F`
- Muted: `#9A9A9A`（副标题、轴标签、类别标签）
- 默认柱色: `#4A4A4A`，只把重点柱设为 Accent
- 网格线: `rgba(245,245,242,.08)`
- 基线: `#3A3A3A`
- 透明导出面板: `rgba(20,20,20,.94)`

## Typography

- 字体栈：`"PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`，开启 `-webkit-font-smoothing: antialiased`
- 标题：字重 800，68px，`letter-spacing: 0`
- 副标题：字重 500，30px，Muted 色
- Y 轴数值：字重 500，20px，Muted 色
- 柱形数值：字重 700，30px，`tabular-nums`
- X 轴类别标签：字重 500，24px，Muted 色

## Corners and spacing

- 画面安全边距：96px（上下）/ 112px（左右）
- 柱形为直角（`rx: 0`）
- 柱形宽度占 slot 的 55%，单根上限 200px
- 标题与图表间距：48px
- 图表底部与 X 轴标签：28px

## Depth

仅用极细网格线和基线构建层次，不使用卡片阴影、渐变背景或装饰元素。

## 柱形与布局

- 柱形从底部基线向上生长（transform-origin: bottom）
- 数值标签紧贴柱形顶部，入场时上移 12px 并淡入
- 柱形颜色可逐条指定，未指定时回退到 accent 色
- 最大数据值自动放大 1.15 倍作为 Y 轴上限，确保顶部不触边

## Motion

- 0.1s 标题遮罩上推（`yPercent 105→0`，`expo.out` 0.62s）；0.3s 副标题淡入上移 12px（`power2.out` 0.4s）
- 0.35s 基线从左向右生长（`power3.inOut` 0.6s）；网格线与 Y 轴数值依次淡入（`ease: "none"`，间隔 0.05s）
- 0.65s 起柱形依次生长（`expo.out` 0.8s，间隔 0.12s），直接落定；1.2s 起数值依次出现
- 5.5s 整个画面向右擦出（`clipPath`，`power3.in` 0.38s）

## Avoid

- 不使用 3D 柱形、圆柱形或棱柱效果
- 不使用饼图、环形图替代柱形
- 不使用渐变填充柱形（纯色即可）
- 不添加柱形间连接线或折线叠加
- 不使用阴影强调柱形
- 不引入调色板之外的新颜色

## Export modes

- 纯色 MP4 保留完整深色画布。
- 透明导出使用局部实色面板（`rgba(20,20,20,.94)`，圆角 6px，四周内收 58px / 72px）承载坐标、标签与柱形，面板之外保持透明。
