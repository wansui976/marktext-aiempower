# UI 现代化改造计划

> 分支：`feat/ui-modernize`　·　状态：阶段 0～4 已完成

## 设计方向

**Typora + Linear：内容优先，界面元素尽量淡化。**

- 编辑区是唯一主角；侧边栏、标题栏、标签页使用低对比度、细边框或无边框
- 交互反馈靠柔和的底色块（圆角 hover / active），不靠粗线条和阴影
- 统一的间距、圆角、阴影、动效 token；统一系统 UI 字体
- 图标统一为 [Lucide](https://lucide.dev)（ISC License）线性风格
- 全部 41 个主题保留，精修 6 个代表主题

## 技术约束

- Electron 18 = Chromium 100：**不能用** `color-mix()`、`:has()`；可用 `backdrop-filter`、`inset`、`gap`、CSS 变量；CSS 嵌套由 postcss 编译
- 主题依赖 `src/renderer/assets/styles/index.css` 中约 66 个旧变量：**只新增、不改名**，新 token 从旧变量推导，保证第三方/自定义主题兼容
- Element 样式由 `util/theme.js#addElementStyle()` 运行时注入（`#409EFF → var(--themeColor)`），覆盖层在其后注入
- 不修改导出/打印相关样式：`src/muya/lib/assets/styles/exportStyle.css`、`printService.css`
- 窗口已是无边框 `hiddenInset`，`body` 背景透明

## 阶段

| # | 内容 | 预计 | 状态 |
|---|---|---|---|
| 0 | 准备：分支、Playwright 截图脚本、改造前基线截图 | 0.5d | ✅ |
| 1 | 设计 token：间距/圆角/阴影/动效/字体/语义色；滚动条、focus ring | 1d | ✅ |
| 2 | Element UI 覆盖层 `element-overrides.css`（button/dialog/input/switch/tabs/tooltip/table/tree） | 1–1.5d | ✅ |
| 3 | 主框架：标题栏、侧边栏（树/目录/搜索）、标签页、通知；Lucide 图标替换 | 3–4d | ✅ |
| 4 | 浮层与弹窗：命令面板、Muya 浮层（`baseFloat` 等）、业务弹窗 | 2d | ✅ |
| 5 | 设置窗口 | 1.5d | |
| 6 | AI 模块对齐：`claudeChat.vue`、`chat/*`、`inlineAiPrompt.vue` | 1.5d | |
| 7 | 主题回归：41 个主题截图检查；精修 6 个代表主题（`graphite-red` 默认浅色、`graphite-black` 默认深色、`nord`、`catppuccin-latte`、`tokyo-night`、`rose-pine`） | 1.5d | |
| 8 | （可选）macOS vibrancy 毛玻璃，设置项开关，默认关闭 | — | |

每个阶段独立提交，可在任意阶段停下。

## 截图对比

```bash
yarn run pack
yarn run ui:screenshots ui-screenshots/after            # 6 个代表主题
yarn run ui:screenshots ui-screenshots/after nord dracula # 指定主题
```

覆盖视图：文件树、搜索、目录、格式工具栏、块菜单、快速插入、查找替换、命令面板、关于/反馈弹窗、通知、设置窗口。输出目录 `ui-screenshots/` 已加入 `.gitignore`。

> 本地构建提示（Node 22 / Python 3.12+）：原生模块重建需要 `distutils`，可用带 setuptools 的 venv：
> `PYTHON=<venv>/bin/python npm_config_node_gyp=<node-gyp@10>/bin/node-gyp.js yarn rebuild`

## 设计 token（阶段 1）

```
间距   --space-1..6        4 / 8 / 12 / 16 / 20 / 24px
圆角   --radius-sm/md/lg   6 / 8 / 12px
阴影   --shadow-1..3       由浅到深
动效   --ease, --duration-fast/normal   120 / 200ms
字体   --font-ui           系统 UI 字体栈（含 PingFang SC / Microsoft YaHei）
语义   --surface-*, --border-subtle, --text-primary/secondary/muted  → 映射到旧变量
```

## 实施记录

- **图标**：Lucide 源文件放在 `src/renderer/assets/icons/lucide/lucide-*.svg`（`lucide-` 前缀避免与已有 sprite ID 冲突），只保留 path，描边/填充由 CSS 控制。全局组件 `<lucide-icon name="x" :size="14">`（`components/lucideIcon`）。通知服务的 HTML 模板内联 Lucide SVG。
- **主题中的标签栏规则**：38 个主题原本带有相同模板的 `.editor-tabs` / `.tabs-container > li` `!important` 规则，会覆盖新标签栏设计。已统一移除，并把各主题的颜色保留为变量 `--tabBarBgColor`、`--tabBarBorderColor`。
- **选中态**：使用中性色 `--surface-selected`（= `--surface-active`），主题色只用于小面积强调（未保存圆点、激活开关等）。
- **Muya 图标**：Muya 原 PNG 图标（`assets/pngicon`）换成 Lucide，生成为 `src/muya/lib/assets/icons/lucide.js` 中的 SVG data URI，沿用原有 `background: url()` + `drop-shadow` 着色机制，渲染代码无需改动，也不依赖 webpack 的 SVG loader（渲染进程与 Muya 独立构建的 SVG 规则不同）。`pngicon/copy` 仍被 AI 聊天组件引用，阶段 6 一并替换后删除。
- **iconfont sprite**：`assets/symbolIcon` 已无引用，已删除；渲染进程图标全部为 Lucide。
- **Muya 浮层**：样式使用 token 并带回退值（如 `var(--radius-md, 8px)`），保证 Muya 单独发布时可用；去掉了 popper 箭头；21 个深色主题中强制浮层阴影的 `!important` 规则已移除。
- **遮罩**：`.v-modal` 颜色仍由主题 `--maskColor` 决定，仅调整不透明度。
- **测试注意**：`yarn unit` 的 karma 构建会覆盖 `dist/electron/index.html`；单独跑 e2e 或截图前需重新 `yarn run pack:renderer`。

## 验收标准

- `yarn lint`、`yarn unit`、e2e 通过
- 改造前后截图对比；41 个主题无明显破损、文字可读
- 导出 HTML/PDF 与打印结果不变
- macOS / Windows / Linux 标题栏正常（Windows/Linux 需额外验证）

## 风险

1. 第三方主题与用户自定义 CSS —— 只新增变量、不改旧变量名
2. Muya 样式泄漏到导出 —— 仅修改 `ui/*` 浮层，不碰导出 CSS
3. 图标替换量 —— sprite 图标较多，优先替换高频图标
