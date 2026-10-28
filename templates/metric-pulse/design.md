# 核心指标视觉规范

## 方向

深色、编辑感、强对比的数据镜头。它应该像杂志信息图被搬进视频，而不是网页仪表盘。

## Palette

- Background: `#0D0D0D`
- Foreground: `#F5F5F2`
- Accent: `#FF5A1F`（顶部短横线、大数字、单位）
- Muted: `#C8C8C8`（说明文字）
- Line: `#3A3A3A`（说明区上方分隔线）

## Typography

- 字体栈：`"PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`，开启 `-webkit-font-smoothing: antialiased`
- 标题：字重 800，80px，`letter-spacing: 0`
- 大数字：字重 800，360px，`font-variant-numeric: tabular-nums`
- 单位：字重 700，92px；说明：字重 500，44px

## Corners and spacing

- 画面安全边距：82px / 108px / 78px（上 / 左右 / 下）
- 不使用卡片与圆角，靠排版分区：标题居上、数字居中、说明在右下占 54% 宽
- 顶部短横线：168px × 8px，Accent 实色

## Depth

只用顶部短横线、说明区上方 2px 分隔线与字号对比构建层次，不使用颗粒、低透明度大字或卡片阴影。

标题、数字和说明必须直接构成动效主体，不增加眉题、编号、模板名、时长或与主数据无明确关系的二级指标。说明为空时自动隐藏。

## Motion

- 0.1s 短横线生长（`power3.inOut` 0.5s）→ 0.25s 标题遮罩上推（`expo.out` 0.62s）
- 0.55s 数字淡入上移并从 0 滚动到目标值（`expo.out` 1.3s，直接落定）；1.1s 单位淡入
- 0.95s 说明区从左擦入（`clipPath`，`expo.out` 0.5s），说明文字淡入上移
- 5.5s 整个画面向右擦出（`power3.in` 0.38s）

## Avoid

- 不使用蓝紫渐变、霓虹描边或渐变文字
- 不使用居中悬浮的网页卡片布局
- 不使用饼图、坐标网格或图表库
- 不在默认画面中引入此调色板之外的新颜色

## Export modes

- 纯色 MP4 铺满 `#0D0D0D` 深色画布。
- 透明导出不加任何承载面板，只保留文字、数字与线条。
