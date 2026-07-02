# 数字计数器视觉规范

## 方向

巨型数字的冲击力镜头。数字本身占据画面绝对主导，周围元素只起辅助说明作用。像仪表盘读数被搬到视频里。

## Palette

- Background: `#12100E`
- Foreground: `#F4EFE7`
- Accent: `#FF5A36`
- Muted: `#B8ADA2`
- Bright muted: `#D8CEC4`
- Line: `#3A3029`
- Strong line: `#5A4840`

## Typography

- 标题：`IBM Plex Mono`，字重 600，56px，Muted 色
- 数值：`IBM Plex Mono`，字重 900，320px，Accent 色，tabular-nums
- 后缀：`IBM Plex Mono`，字重 700，96px，Accent 色
- 说明：`IBM Plex Mono`，字重 400，36px，Bright muted
- 等宽数字确保滚动过程中不发生横向抖动

## Corners and spacing

- 画面安全边距：96px
- 标题与数值间距：80px
- 数值与说明间距：80px
- 进度环直径：720px，线宽 12px

## Depth

仅用半透明大字（"COUNT" 或类似 ghost text）作为背景层次，opacity 0.06。进度环使用双圆环：暗色轨道 + 强调色进度弧。

## 数值与进度环

- 数字从 0 滚动到目标值，使用 power2.out 缓动，确保最终速度逐渐降低
- 数字滚动时长 2.5s，与进度环绘制同步
- 数字停止后带轻微弹跳（scale 1.02→1.0，0.15s）
- 进度环从顶部（-90°）开始顺时针绘制
- 后缀在数字停止后从右侧滑入
- 前缀和后缀独立于数字滚动，不随数字变化而抖动

## Avoid

- 不使用数字跳动、随机闪烁或故障效果
- 不使用多行数字堆叠
- 不使用渐变色数字
- 不添加无关的装饰性粒子或光效
- 不引入调色板之外的新颜色
