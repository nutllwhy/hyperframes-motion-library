# 可复用画风

模板决定“怎样讲信息”，画风决定“用什么视觉语言讲”。同一个大数字、对比图或流程，切换画风后仍表达同一件事。

## 当前画风

| ID | 名称 | 视觉与运动 | 适用 |
| --- | --- | --- | --- |
| `classic-orange` | 黑橙经典 | 深色、无衬线粗体、橙色线条，沿用原模板编排 | 数据、科技、通用 |
| `paper-editorial` | 纸感编辑 | 暖纸纹、衬线标题、细墨线、偏移纸签；平滑滑入，去掉弹跳 | 深度解读、资料、人文 |
| `sketch-notes` | 手绘笔记 | 点阵纸、铅笔虚线、排线图形、橙色批注；确定性的逐拍显现 | 教学、流程、复盘 |
| `bold-geometry` | 几何构成 | 直角色块、粗切分线、重字、硬阴影；快速切入落定 | 观点、强对比 |

使用系统通用字体回退，不要求每个使用者安装特定中文手写字体。纸感标题可使用系统的中文衬线回退；不同电脑的中文字形会有差异。

## 整片调用

V1.2 方案在顶层指定风格：

```json
{
  "version": "1.2",
  "project": "我的知识视频",
  "styleId": "paper-editorial",
  "outputFormat": "mp4",
  "scenes": []
}
```

`scenes` 填写方式参考 `../examples/motion-plan.example.json`。没有声明场景风格的任务继承整片风格。单场景有意切换时写 `scene.styleId`；不要同时在 `variables.styleId` 中填写另一个值。

风格选择会把声明的颜色变量设置成对应色板。之后可以手工微调。API / 命令行会替换缺省颜色或与原默认值相同的颜色，保留真正自定义的颜色。

## 新增一种画风

先阅读 `catalog.json` 和 `runtime.css` / `runtime.js`，随后：

1. 在 `catalog.json` 增加稳定 ID、名称、用途、`tokens`、`typography`、`material`、`motion`、`rules`。核心颜色必须是六位十六进制。
2. 在 `runtime.css` 中用 `html[data-motion-style="新ID"]` 限定规则。通过 `data-style-role` 适配标题、正文、数字、纸签、面板、图表轨道等语义角色；需要模板特有处理时增加精确选择器。
3. 在 `runtime.js` 的 `MotionStyles.ease()` 中定义确定性缓动。保留每个模板的时长和编排，不能添加时钟、随机数、永动动画，也不能凭空增添信息。
4. 运行 `npm run sync:styles`。生成器给横竖屏合成增加隐藏 `styleId` 枚举，并嵌入统一 CSS / JS / 注册表。合成可以独立渲染，无需向父目录请求样式文件。
5. 运行 `npm run check`。先启动 `npm run dev`，再运行 `npm run check:styles -- --screenshots`。检查大数字、图表和流程使用同一套风格后的样张，再检查透明输出与竖屏排版。

添加新模板时也执行第 4、5 步。通常无需修改已有预设，未指定 `styleId` 的旧预设保持黑橙经典。原生模板变量继续由 HyperFrames `data-composition-variables` 暴露。

`motionPreview=1` 与 `variables` 查询参数仅供模板库的浏览器预览。正式渲染通过 HyperFrames 变量传入，时间线仍保持暂停、可寻帧。预览循环不会进入正式渲染。

## 设计方法

风格层把"画法"和"画风"分开：用色板、材质、字体、线条和动作共同定义一套风格，并用同一份内容出样张比较。运行时与样式实现均为本项目原创编写。
