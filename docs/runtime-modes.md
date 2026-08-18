# 问启星河：Skill-first 到 Standalone

## 产品顺序

问启星河的基础产品是 **Agent Skill**，不是无模型界面演示。用户从第一天起就应输入自己的真实经营问题，并得到宿主大模型动态生成的理解、追问、方法编排、问题簇和研究问题。

现有 HTML 工作台是未来 Standalone 的交互外壳和设计验证资产，目前不作为基础版客户价值的替代品。

## 两个正式版本

| 版本 | 用户获得什么 | 模型与工具 | 交互界面 |
| --- | --- | --- | --- |
| Agent Skill 基础版 | 对真实经营问题进行连续智能探寻，调用宿主检索、文件、知识库与多智能体能力 | Codex、GPTs、Gems 或企业 Agent 提供 | 宿主 Agent 对话与成果文件 |
| Standalone 产品版 | 同样的智能探寻能力，加上专用工作台、账户、团队协同与运营治理 | 问启星河后端调用 DeepSeek，并连接自有检索与存储 | 现有银河工作台演进后的 Web 应用 |

无模型状态只允许作为研发故障降级和自动化测试，不作为对客户销售的产品版本。

## 现有成果如何复用

### 直接进入 Agent Skill

- `src/workflow.mjs` 的七阶段状态和回退规则 → `references/workflow-contract.md`；
- `src/methods.mjs` 的方法推荐与苏格拉底序列 → `references/method-library.md`；
- `src/research-forge.mjs` 的问题簇、变量与研究问题结构 → `references/output-contract.md`；
- `src/artifacts.mjs` 的研究简报和 Obsidian 字段 → Skill 成果协议；
- `server/contracts.ts` 的结构化边界 → Skill 会话 JSON 契约及校验器；
- 安全、来源深度、用户校正原则 → Skill 质量门槛。

### 保留到 Standalone

- HTML/CSS、银河粒子动画和六阶段工作台；
- Fastify、SSE、SQLite 和 DeepSeek provider；
- 浏览器本地恢复、导出与响应式布局；
- 同源 API、密钥隔离与错误降级；
- 客户账户、团队权限、成本控制和审计等后续产品能力。

### 不应复用为产品逻辑

- 固定问题对应的预置回答；
- 预置来源替代真实文献检索；
- 浏览器端规则判断替代大模型理解；
- 为了画面完整而伪造“已核验”或“已研究”状态。

## 共用能力契约

Skill 和 Standalone 必须共享以下语义，允许实现方式不同：

- `originalQuestion` 永久保留用户原话；
- `understanding` 区分事实、假设、状态置信度与原文证据；
- `questionCluster` 保留问题谱系和未选分支；
- `researchQuestion` 包含经营表述、学术表述、变量、机制、边界和分析单位；
- `evidence` 标注来源、访问深度、支持关系和限制；
- `unresolvedItems` 阻止系统把未知包装成结论；
- 阶段成果可导出到 Obsidian，并可被另一 Agent 恢复。

## 演进路线

1. `0.4-skill-foundation`：安装并真实使用 `socratic-business-inquiry`；已提供会话生命周期、暂停恢复、检查点和五类经营问题验收合同，下一步收集真实会话记录。
2. `0.5-skill-research`（本分支）：把证据阶段升级为确定性子流程——`search-brief` 检索计划、`verify-concept` 概念核验、`obsidian-note` 写出，由 `scripts/research-cli.mjs` 提供，`RESEARCH_SEARCH_RECORDED` / `CONCEPT_VERIFIED` 事件写入会话；宿主仍负责语义分析与真实联网检索。
3. `0.6-contract-freeze`：根据真实使用稳定会话、问题簇、研究问题和成果协议。
4. `0.7-standalone-alpha`：让 Web 工作台调用 DeepSeek 与同一协议，替换宿主能力而不重写思考内核。
5. `1.0-pilot`：增加账号、租户隔离、团队协同、成本预算、审计与数据保留策略。

## Standalone 的替换关系

| Agent Skill 基础版依赖 | Standalone 替代件 |
| --- | --- |
| 宿主大模型 | DeepSeek provider |
| 宿主联网检索 | 文献检索与网页抓取服务 |
| 宿主文件系统/知识库 | 数据库、对象存储、Obsidian 连接器 |
| 宿主任务与多智能体 | 自有 Agent 编排器和任务队列 |
| 宿主对话 UI | 银河工作台 |

因此 Standalone 是“部署能力替换”，不是另写一套提问方法。
