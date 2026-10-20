## 方法与适用范围

生成式 AI 可以通过自然语言交互帮助搭建原型。随着需求和代码规模增长，开发者还需要明确需求边界、架构约束、验收方式与项目上下文，才能持续检查生成代码的行为。BMAD 尝试将这些信息组织成可交接的文档与任务。

_BMAD_（Breakthrough Method for Agile AI-Driven Development）工作流引入了**规范驱动开发**和**上下文工程**的概念，将传统的*敏捷开发*（Agile）流程与*多智能体系统*（Multi-Agent Systems, MAS）相结合，通过**标准化的文档流**约束 AI 的生成行为，帮助各角色共享需求和实现约束。

## BMAD v6 Alpha

### 安装与初始化

交互式安装程序会引导设置，并创建一个包含所有代理和工作流程的文件夹，在终端中运行：

```bash
# 固定到原笔记时间可用的 Alpha 版本
npx bmad-method@6.0.0-alpha.13 install
```

安装时需包含 BMad Method（BMM）模块，并加载 Analyst 代理，再在所选 IDE 的聊天面板中执行当时版本的初始化命令：

```text
*workflow-init
```

Analyst 被唤醒，并询问：

- 项目名称及其目标
- 是已有代码库还是一个新项目
- 大致的规模和复杂度（可以稍后调整）

初始化用于确定项目轨道并建立工作流状态，不会自动完成所有规划文档。随后可让 Analyst 执行 `*product-brief`，整理项目目标、用户与范围；该简报是 PRD 的推荐输入。

### 规划与架构

跨角色或阶段时使用新会话，并交接已确认的文档，减少无关上下文。

**目标**：形成需求与架构文档。下列 `docs/` 为输出目录示例，实际路径以安装时配置的输出目录为准。

1. **prd.md**：
   - **指令**：`*create-prd`
   - **交互**：PM 会读取已确认的项目简报进行分析。
   - **产出**：确认生成`docs/prd.md`。
2. **ux-design.md**（可选）：
   - **指令**：`*create-ux-design`
   - **交互**：UX 专家会明确用户流程、组件策略和线框描述。
   - **产出**：确认生成`docs/ux-design.md`。
3. **architecture.md**（按所选规划轨道）：
   - **指令**：`*create-architecture`
   - **交互**：Architect 会读取 PRD，询问技术栈偏好。
   - **产出**：确认生成`docs/architecture.md`。
4. **epics.md**：
   - **指令**：`*create-epics-and-stories`
   - **交互**：PM 会结合 PRD 和架构文档，先生成 Epic，然后将 epic 拆解为具体的 Story。
   - **产出**：确认生成`docs/epics.md`。
5. **实施就绪检查**：
   - **指令**：`*implementation-readiness`
   - **交互**：Architect 验证所有规划文件（PRD、UX、架构、Epic）之间的连贯性。

### 实现与审查循环

下列命令是 Alpha 工作流入口，产物路径由安装时的输出配置决定。

每个 Story 依次经过起草、实现、审查和状态更新；切换任务时交接对应 Story 与必要的架构约束。

**目标**：拆解并执行 Story。

1. **sprint-status.yaml**：
   - **指令**：`*sprint-planning`
   - **交互**：SM 会创建 yaml 文件用于跟踪 Epic 和 Story。
   - **产出**：确认生成`docs/sprint-artifacts/sprint-status.yaml`。
2. **X-X-story.md**：
   - **指令**：`*create-story`
   - **交互**：SM 会从 Epic 中起草单个 Story 文件。
3. **实现**：
   - **指令**：`*dev-story`
   - **交互**：DEV 会实现 Story 并更新 sprint-status。
4. **审查**：
   - **指令**：`*code-review`
   - **交互**：DEV 会执行质量审查。
5. **继续下一项**：
   - 重复实现与审查循环，开始下一个 Story。
   - 一个 Epic 的 Story 完成后，可让 SM 执行 `*epic-retrospective` 进行复盘。

<img class="blog-image" src="{{ '/assets/img/blog/bmad/implementation-review-loop.png' | relative_url }}" alt="BMAD：AI 辅助开发工作流笔记：Implementation Loop" width="1802" height="1906" loading="lazy" decoding="async">

参考文献：

- [GitHub - bmad-code-org/BMAD-METHOD: Breakthrough Method for Agile Ai Driven Development](https://github.com/bmad-code-org/BMAD-METHOD)
- [v6 Alpha.13 对应提交的快速入门](https://github.com/bmad-code-org/BMAD-METHOD/blob/afd2a163bff3dc11b36afa11b2cbd1c3aab3f755/src/modules/bmm/docs/quick-start.md)

## BMAD v4

BMAD 分为两个主要阶段：_规划_（Planning）和*开发*（Development）。

### 规划阶段

原版本支持在 Web UI 中完成规划，再通过文档交接到 IDE 开发。可按工具的上下文能力与使用方式选择入口，流程如下：

- **初始化 Orchestrator**：在 Gemini 中创建一个“Gem”（类似于自定义 GPT），导入[全栈团队文件](https://github.com/bmad-code-org/BMAD-METHOD/blob/V4/dist/teams/team-fullstack.txt)或其他团队文件（`dist/teams/`），附上说明`Your critical operating instructions are attached, do not break character as directed`，输入`*help`以查看可用命令 [03:39](http://www.youtube.com/watch?v=Sosf8Z0T_M8&t=219)。
- **产品经理**（Product Manager, PM）：负责需求分析，通过对话创建*项目简报*（Project Brief）和*产品需求文档*（Product Requirements Document，PRD） [05:44](http://www.youtube.com/watch?v=Sosf8Z0T_M8&t=344)。
- **用户体验专家**（UX Expert）：负责用户体验与界面规范，基于 PRD 生成详细的*UX/UI 规范*，包括用户画像、线框描述、组件库和配色方案 [10:12](http://www.youtube.com/watch?v=Sosf8Z0T_M8&t=612)。
- **架构师**（Architect）：负责技术决策，生成*架构文档*（Architecture MD），确定技术栈、数据库 Schema 和目录结构 [11:20](http://www.youtube.com/watch?v=Sosf8Z0T_M8&t=680)。
- **产品负责人**（Product Owner, PO）：审查所有文档，确保一致性并最终签署通过 [12:53](http://www.youtube.com/watch?v=Sosf8Z0T_M8&t=773)。

```text
*analyst         # 启动市场分析
*pm              # 创建产品需求文档
*architect       # 设计系统架构
*po              # 验证文档一致性
```

### 开发阶段

如果 PO 确认文档匹配，转移到 IDE（如 Cursor, VS Code）中进行开发。流程如下：

- **文档分片**（Sharding）：在 IDE 中安装 BMAD 工具（`npx bmad-method@4 install`），运行脚本将规划阶段生成的长文档（PRD, 架构文档）拆分成更小的文件。这样做是为了让 Developer Agent 在编写代码时，只读取当前任务所需的上下文，避免上下文窗口溢出并提高准确性 [14:06](http://www.youtube.com/watch?v=Sosf8Z0T_M8&t=846)。
- **敏捷教练**（Scrum Master）：负责任务管理，将大的需求拆解为具体的*用户故事/开发任务*（User Stories）。AI 会读取拆分后的文档，起草第一个 Story（包含验收标准、任务清单、测试脚本等）供你审核 [18:48](http://www.youtube.com/watch?v=Sosf8Z0T_M8&t=1128)。
- **开发者代理**（Developer Agent）：一旦 Story 被批准，调用 IDE 中的开发者代理执行任务。AI 会自动编写代码、运行测试、修复错误，直到完成该 Story 的所有任务 [20:38](http://www.youtube.com/watch?v=Sosf8Z0T_M8&t=1238)。
- **QA 与循环**：可以引入 QA 代理进行代码审查。完成一个 Story 后，标记为 Done，然后让 Scrum Master 生成下一个 Story，如此循环直至项目完成 [22:20](http://www.youtube.com/watch?v=Sosf8Z0T_M8&t=1340)。

```text
*po shard-epics   # 分解史诗故事
*sm               # 生成开发故事
*dev              # 实现具体功能
*qa               # 代码审查
```

参考文献：

- [BMAD Vibe Coding Workflow Is a Massive Level Up](https://www.youtube.com/watch?v=Sosf8Z0T_M8)
- [GitHub - bmad-code-org/BMAD-METHOD at V4](https://github.com/bmad-code-org/BMAD-METHOD/tree/V4)
- [BMAD-METHOD/docs/user-guide.md at V4 · bmad-code-org/BMAD-METHOD · GitHub](https://github.com/bmad-code-org/BMAD-METHOD/blob/V4/docs/user-guide.md)
