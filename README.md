# 问启星河 · 提问驱动工作终端 POC 0.3

一个从经营困惑出发、由大语言模型协助澄清问题的 Agent Skill 与 Standalone 工作台项目。

产品采用 **Skill-first** 路线：基础版是由宿主大模型驱动的 `socratic-business-inquiry` Agent Skill；下一阶段才把模型、检索和存储替换成 DeepSeek 后端与自有连接器，形成 Standalone。现有单 HTML 是 Standalone 的交互外壳原型，不是无智能的客户基础版。具体复用边界见 `docs/runtime-modes.md`。

## 基础版：Agent Skill

Skill 源码位于 `skills/socratic-business-inquiry`。它直接使用宿主 Agent 的模型处理用户真实问题，覆盖问题理解、状态暂定判断、方法推荐、逐轮探寻、问题簇、研究问题、证据边界与成果协议。

在支持本地 Skill 的 Agent 中安装后，用户可以直接说：

> 使用 `$socratic-business-inquiry` 帮我探寻：为什么我们公司的战略落地越来越慢？

## 直接体验

有两种运行方式：

- 双击 `dist/index.html`：完全离线，使用本地降级引导，不发起网络请求。
- 启动本地服务：页面通过受控后端调用 DeepSeek；未配置密钥时自动使用明确标注的降级引导。

两种方式都会把问题、分支、成果与事件默认保存在当前浏览器，并可导出 Obsidian 兼容 Markdown 或 JSON 备份。

## 当前验证范围

- 把“是否/会不会/能不能”等判断题展开为 WHAT、WHY、HOW 与 EVIDENCE 四条路径。
- 非评判式意图反映、基于本轮文本的暂定状态分析和一个主追问。
- 问题谱系、Question Brief、研究计划、文章提纲。
- 投影式 Canvas 2D 粒子场状态：待命、理解、展开、成果就绪。
- `prefers-reduced-motion`、手动低动态、Canvas 失败降级。
- 浏览器本地保存、恢复、清除、Markdown/JSON 导出。
- 16:9 主舞台、桌面三栏与移动端单列响应式布局。

当前版本不会提供事实研究、心理诊断或真实多智能体执行。HTTP 模式可调用 DeepSeek 完成问题分析，但模型输出仍是待用户校正的工作假设，不是事实结论。

## 开发与验证

需要 Node.js 22 或更高版本。

```powershell
npm install
npm run demo
```

浏览器打开服务端输出的本地地址即可。若要启用 DeepSeek：

```powershell
Copy-Item .env.example .env
# 在 .env 中设置 DEEPSEEK_API_KEY，然后重新运行 npm run dev
```

不要把真实密钥粘贴到 HTML、前端设置、聊天记录或 Git。独立版中的密钥只应保存在部署主机的 `.env` 或云平台服务端密钥管理中。

完整验证：

```powershell
npm run verify
```

源码按职责拆分，构建脚本将 HTML、CSS 与 JavaScript 合并为 `dist/index.html`。离线文件模式不需要 Node.js，也不会读取 `.env`。

## 数据与隐私

- 不包含分析 SDK、远程字体或 CDN。
- API Key 只由服务端读取，不写入 HTML、浏览器存储、SQLite 或错误响应。
- `localStorage` 键：`socratic-galaxy-poc-v1`。
- 存储失败时切换为临时会话，不阻塞导出。
- 清除按钮采用二次点击确认，避免误删。
- 系统只推断本轮表达状态并显示置信度，不推断人格或疾病；用户可以修正。

## 下一步

先用 Agent Skill 对真实经营问题做前向测试，稳定共用数据契约；再让现有 Web 工作台通过 DeepSeek 和自有工具实现同一契约。详细节奏见 `docs/runtime-modes.md`。
