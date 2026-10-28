# 折线绘制视觉规范

## 方向

时间序列趋势镜头。折线从左到右逐段绘制，数据点在线条到达时依次出现，终点数值最后落定。

## Palette

- Background: `#0D0D0D`
- Foreground: `#F5F5F2`
- Accent: `#FF5A1F`（折线、数据点、终点数值）
- Muted: `#9A9A9A`（副标题、轴标签）
- 网格线: `rgba(245,245,242,.08)`
- 基线: `#3A3A3A`
- 透明导出面板: `rgba(20,20,20,.94)`

## Typography

- 字体栈：`"PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`，开启 `-webkit-font-smoothing: antialiased`，图表内数字 `tabular-nums`
- 标题：字重 800，62px，`letter-spacing: 0`
- 副标题：字重 500，28px，Muted 色
- 轴标签：字重 500，20px，Muted 色
- 终点数值：字重 800，40px，Accent 色

## Corners and spacing

- 画面安全边距：96px（上下）/ 112px（左右）
- 标题与图表间距：40px
- 图表区域边距：左 90px、右 50px、上 50px、下 60px
- 数据点半径：4px（终点 9px）
- 折线线宽：4px

## Depth

只用横向细网格线与基线构建层次，不画纵向网格，不做折线下方的填充区域，避免画面碎片化。

## 折线与数据点

- 折线使用 `stroke-dashoffset` 从左侧绘制到右侧，0.8s 开始，时长 2.2s，`power2.inOut`
- stroke-linecap / stroke-linejoin 为 round；平滑曲线使用三次贝塞尔（控制点在两点中间）
- 数据点为 Accent 实心圆，按折线实际到达该点的时刻直接出现（0.1s 淡入）
- 2.9s 终点数值淡入上移 12px（`power2.out` 0.4s）
- 标题遮罩上推（`expo.out`），基线从左向右生长（`power3.inOut`），网格与轴标签依次淡入
- 6.5s 整个画面向右擦出（`clipPath`，`power3.in` 0.38s）

## Avoid

- 不使用坐标网格的交叉线（只画横向）
- 不使用饼图、环形图替代折线
- 不添加数据点间的连接线（折线本身就是连接）
- 不使用阴影强调折线
- 不引入调色板之外的新颜色

## Export modes

- 纯色 MP4 保留完整深色画布。
- 透明导出使用局部实色面板（`rgba(20,20,20,.94)`，圆角 6px，四周内收 58px / 72px）保证网格、坐标与趋势线在实拍画面上仍可读。
