# 数字计数器视觉规范

## 方向

巨型数字的独立全屏镜头。数字本身占据画面绝对主导，标题与说明只承担必要语境。

## Palette

- Background: `#0D0D0D`
- Foreground: `#F5F5F2`
- Accent: `#FF5A1F`（顶部短横线、数值、后缀）
- Muted: `#C8C8C8`（说明文字）
- Line: `#3A3A3A`（说明上方分隔线）

## Typography

- 字体栈：`"PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`，开启 `-webkit-font-smoothing: antialiased`
- 标题：字重 800，76px，`letter-spacing: 0`
- 数值：字重 800，292px，Accent 色，`font-variant-numeric: tabular-nums`
- 后缀：字重 700，104px，Accent 色
- 说明：字重 500，40px
- 表格数字确保滚动过程中不发生横向抖动

## Corners and spacing

- 画面安全边距：82px / 108px / 78px（上 / 左右 / 下）
- 版面分三行：标题居上、数值居中、说明在左下占 58% 宽
- 数值左对齐，形成唯一视觉重心

## Depth

不使用面板，只用顶部 168px×8px 橙色短横线与说明上方 2px 分隔线建立层次，不添加与数字含义无关的英文装饰。

## 数值动画

- 0.1s 短横线生长（`power3.inOut`）→ 0.25s 标题遮罩上推（`expo.out` 0.62s）
- 0.5s 数值淡入上移；0.55s 起从 0 滚动到目标值，`power3.out` 2.2s，末段自然减速，直接落定
- 2.1s 说明淡入上移；2.3s 后缀淡入
- 前缀和后缀独立于数字滚动，不随数字变化而抖动
- 4.5s 整个画面向右擦出（`clipPath`，`power3.in` 0.38s）

## Avoid

- 不使用数字跳动、随机闪烁或故障效果
- 不使用多行数字堆叠
- 不使用渐变色数字
- 不添加没有分母依据的进度环、装饰性粒子或光效
- 不引入调色板之外的新颜色

## Export modes

- 纯色 MP4 铺满 `#0D0D0D` 深色画布。
- 透明导出不加承载面板，只保留文字、数字与线条。
