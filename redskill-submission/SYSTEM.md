# 动效资产入库规范

## 一个动效模板必须包含

1. 独立目录：`templates/<template-id>/`
2. `index.html`：可直接被 HyperFrames 渲染的参数化动效
3. `design.md`：该动效的视觉语言、颜色、字体、边角与禁用项
4. `presets/default.json`：可以直接产出完整画面的默认数据；建议再补至少两套真实场景预设
5. `meta.json`：稳定 ID 与名称
6. `catalog.json` 中的一条目录记录

## 截图入库流程

1. 把截图拆成背景、结构、排版、装饰、运动五层，不只照着静态画面临摹。
2. 标记真正需要复用的变量，例如标题、数字、列表、颜色、图片与时长。
3. 先完成最完整时刻的静态布局，再加入确定性的 GSAP 动画。
4. 为动态文本设置最大宽度、自动换行或字号适配，避免换文案后破版。
5. 增加默认预设，并至少用一组明显不同的数据验证复用性。
6. 通过 `lint`、`validate`、`inspect` 后再把状态改为 `ready`。

## 变量设计原则

- 内容与样式分离：常改的内容做变量，动画结构保留在模板中。
- 每个变量都必须有合理默认值，打开模板就应当是一条完整作品。
- 场景预设必须覆盖全部可见变量，不能依赖调用者猜测缺失字段。
- 颜色使用 `color`，数值使用 `number`，有限选择使用 `enum`。
- 不把元素坐标、缓动曲线等内部实现暴露为日常编辑参数。
- 模板 ID 一旦进入目录就保持稳定，避免预设和历史渲染失联。

## 建议分类

- 标题与开场
- 数据可视化
- 信息卡片
- 字幕与重点标注
- 转场
- 产品演示
- 品牌收尾

## 质量门槛

- 所有动效必须可任意时间点寻帧，禁止依赖随机时间和无限循环。
- 文本、数据和颜色改动后仍保持可读与安全边距。
- 多场景模板必须有转场；单场景模板只在最终段落做退场。
- 默认预设能够直接渲染，且目录信息与实际时长、尺寸一致。
- `presets/` 下所有 JSON 都必须通过变量类型与完整性校验。

## 导出模式

- 新模板必须同时考虑纯色底和透明底，使用隐藏的 `exportMode` 枚举变量切换。
- `exportMode=mp4` 时保留模板定义的深色背景；`exportMode=transparent` 时画布必须透明。
- 透明模式可以保留承载信息所需的局部深色卡片，但不能留下覆盖整帧的黑色背景、网格或环境光。
- 目录中的 `formats` 默认登记 `mp4`、`mov`、`webm`；MP4 用于直接剪辑，MOV 用于带透明通道叠加，WebM 用于网页和兼容软件。
- 透明模式必须分别叠在深色、浅色和实拍画面上检查文字对比、半透明边缘与光晕。

## 发布与副本同步

- 主目录始终是唯一源码，禁止直接在 `redskill-submission/` 中长期维护模板副本。
- 新增模板或预设后运行 `npm run prepare:release`，自动校验、同步 RedSkill 投稿包并构建 GitHub Pages。
- `renders/` 中的 `sample.*` 和手动命名文件属于长期资产；时间戳开头的文件属于临时渲染，可以按保留数量自动清理。

## Agent 动效方案

- 整条视频的动效规划使用根目录 `motion-plan.schema.json` 作为唯一数据契约。
- `director-rules.json` 是画面模式与导演原则的唯一来源；Agent 生成方案前必须阅读。
- Agent 只能引用 `catalog.json` 中存在且状态为 `ready` 的模板 ID。
- V1.1 方案的每个场景必须包含时间码、模板 ID、输出格式、与模板变量声明匹配的 `variables`，以及完整 `director`。
- `director.sourceQuote` 必须来自原始口播；`requiredInformation` 只放必要信息；`forbiddenInformation` 明确禁止无来源的数字、时间、状态、英文标签和模板编号。
- `director.layoutMode` 必须符合模板登记的 `allowedModes`。`fullscreen` 主体填满安全区，`overlay` 才允许避让人物和字幕，`data` 以数据关系为主，`transition` 只服务于真实转折。
- 系统导入时会把模板默认值、可选预设和场景变量合并，再检查变量名称、类型、颜色和枚举值。
- 模板在 `catalog.json` 中必须分别登记真实信息的 `subjectSelectors`、外层框架的 `frameSelectors`、目标 `occupancy` / `span`、实测 `measuredOccupancy` / `measuredSpan` 和 `layoutStatus`。
- 大背景板、空容器和撑满画布的装饰框只能进入 `frameSelectors`，不能进入 `subjectSelectors`；检查必须确认真实内容同时铺开横向与纵向空间。
- `npm run check` 会启动无头 Chrome 测量完整时刻的信息主体边界；布局变化超过 2% 或已通过模板掉出目标范围时检查失败。
- 批量渲染默认顺序执行，避免同时启动多个 Chrome / FFmpeg 任务挤占本机资源。
- 项目输出保存在 `renders/projects/<project-name>/`，文件名包含序号、时间码和模板 ID，方便剪辑时对应口播位置。
