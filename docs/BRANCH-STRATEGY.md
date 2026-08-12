# 问启星河：双路线分支与版本边界

## 分支定义

| 分支 | 定位 | 起点 | 后续允许的开发 |
| --- | --- | --- | --- |
| `baseline/standalone-poc-v0.3` | Standalone 网页产品的冻结基线 | `ac0449f` | 银河工作台、DeepSeek 服务端、账户与团队协作、部署及运营能力 |
| `product/skill-foundation-v0.4` | Agent Skill 基础产品的正式起点 | `febee47` 及其后续 | 对话探寻、方法编排、问题簇、研究问题、证据协议、Agent 工具与 Obsidian 协作 |

旧分支 `feature/poc-v0.1` 保留，不删除、不重写，作为完整演进历史的兼容入口。

## 不丢失的主线资产

Standalone 基线保留截至 `ac0449f` 的全部网页产品成果，包括：

- 自适应银河工作台与粒子动态；
- 六阶段探寻界面、问题簇和研究问题锻造界面；
- DeepSeek 服务端适配、SSE、SQLite 和安全降级；
- 本地恢复、Markdown/JSON 导出、隐私与可访问性设计；
- POC、演示路径、测试与构建资产。

Skill 基线完整继承上述提交历史，并从 `77d1b50` 开始增加：

- `socratic-business-inquiry` 可安装 Skill；
- 模型驱动的实时对话协议，不使用固定答案冒充智能；
- 不可变会话生命周期、校正溯源、暂停与恢复；
- 问题簇、研究问题、证据和成果物契约；
- 五类真实经营问题验收场景及 Obsidian 兼容检查点。

## 开发规则

1. 凡采用 Agent Skill 方式继续开发，必须从 `product/skill-foundation-v0.4` 创建功能分支。
2. 凡开发独立部署网站，必须从 `baseline/standalone-poc-v0.3` 创建 Standalone 功能分支，或在契约冻结后有选择地移植 Skill 契约；不得用网页逻辑覆盖 Skill 的思考内核。
3. 两条路线共享语义契约：`originalQuestion`、`understanding`、`questionCluster`、`researchQuestion`、`evidence`、`unresolvedItems`。
4. Standalone 可以替换运行依赖（宿主模型、搜索、存储、Agent 编排和 UI），但不得重新发明或分叉提问方法本身。
5. 未经明确决定，不合并、不删除、不强制移动这两个基线分支。

## 推荐的后续分支命名

- Skill 功能：`skill/<功能名>`，基于 `product/skill-foundation-v0.4`。
- Standalone 功能：`standalone/<功能名>`，基于 `baseline/standalone-poc-v0.3`。
- 跨路线契约：先在 Skill 路线验证，再以单独提交移植到 Standalone，保留提交来源说明。

## 当前验证门槛

任何基线或后续分支在交付前都必须通过 `npm run verify`。这覆盖单 HTML 构建、前端与 Skill 测试、服务端测试、类型检查和关键脚本语法检查。
