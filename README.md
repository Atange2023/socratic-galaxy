# 问启星河 · 提问驱动工作终端 POC 0.1

一个基于《提问驱动创作平台 PRD v1.5》的单文件、离线优先交互原型。

## 直接体验

下载 `dist/index.html`，双击即可使用。页面不会发起网络请求，问题、分支、成果与事件默认保存在当前浏览器；可随时导出 Obsidian 兼容 Markdown 或 JSON 备份。

## 当前验证范围

- 把“是否/会不会/能不能”等判断题展开为 WHAT、WHY、HOW 与 EVIDENCE 四条路径。
- 非评判式意图反映、用户主动状态自报和一个主追问。
- 问题谱系、Question Brief、研究计划、文章提纲。
- Canvas 2D 银河状态：待命、理解、展开、成果就绪。
- `prefers-reduced-motion`、手动低动态、Canvas 失败降级。
- 浏览器本地保存、恢复、清除、Markdown/JSON 导出。
- 16:9 主舞台、桌面三栏与移动端单列响应式布局。

这不是联网 AI，也不会提供事实研究、心理诊断或真实多智能体执行。界面中的引导均明确标注为本地 POC 建议。

## 开发与验证

需要 Node.js 22 或更高版本；无第三方依赖。

```powershell
node scripts/build.mjs
node --test --test-isolation=none test/*.test.mjs
node --check src/core.mjs
node --check src/galaxy.mjs
node --check src/app.mjs
```

源码按职责拆分，构建脚本将 HTML、CSS 与 JavaScript 合并为 `dist/index.html`。最终运行不需要 Node.js。

## 数据与隐私

- 不包含分析 SDK、远程字体、CDN 或 API 请求。
- `localStorage` 键：`socratic-galaxy-poc-v1`。
- 存储失败时切换为临时会话，不阻塞导出。
- 清除按钮采用二次点击确认，避免误删。
- 用户状态只来自主动选择，不依据措辞推断情绪、人格或疾病。

## 下一步

先用 5–8 名目标用户验证“问题重构是否真的有帮助”和“银河是否提升等待体验而非形成干扰”；之后再考虑通过受控后端接入大模型、来源检索、多智能体与 Obsidian 文件连接器。
