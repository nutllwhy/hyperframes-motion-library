# 折线绘制视觉规范

## 方向

时间序列趋势镜头。折线像被手绘出来一样逐段展开，数据点依次点亮，下方填充区域像墨水晕染般展开。

## Palette

- Background: `#12100E`
- Foreground: `#F4EFE7`
- Accent: `#FF5A36`
- Muted: `#B8ADA2`
- Bright muted: `#D8CEC4`
- Line: `#3A3029`
- Strong line: `#5A4840`
- Fill: `var(--accent)` at opacity 0.12

## Typography

- 标题：`IBM Plex Mono`，字重 700，64px
- 副标题：`IBM Plex Mono`，字重 400，28px，Muted 色
- 轴标签：`IBM Plex Mono`，字重 500，18px
- 终点数值：`IBM Plex Mono`，字重 700，24px，Accent 色

## Corners and spacing

- 画面安全边距：96px
- 标题与图表间距：40px
- 图表区域边距：左 90px、右 50px、上 50px、下 60px
- 数据点半径：8px（终点 10px）
- 折线线宽：5px

## Depth

下方填充区域用 Accent 色的 12% 透明度构建层次，与深色背景形成柔和过渡。网格线仅横向，不画纵向，避免画面碎片化。

## 折线与数据点

- 折线使用 `stroke-dashoffset` 动画从左侧绘制到右侧，时长 2.2s，power2.inOut
- 折线线宽 5px，stroke-linecap: round，stroke-linejoin: round
- 平滑曲线使用三次贝塞尔（控制点在两点中间），默认开启
- 数据点在线条到达后依次弹出，使用 back.out 缓动
- 终点数值标签在折线完成后从右侧滑入
- 填充区域在折线绘制到一半时开始淡入，像墨水晕染
- 数据点使用空心圆（fill: `#12100E`，stroke: accent）

## Avoid

- 不使用坐标网格的交叉线（只画横向）
- 不使用饼图、环形图替代折线
- 不添加数据点间的连接线（折线本身就是连接）
- 不使用阴影或 glow 强调折线
- 不引入调色板之外的新颜色
