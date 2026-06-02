# Agentic Prompts 提示词分析

> 本文档对 `agentic/prompts/base.py` 中的所有提示词变量和动态构建函数进行完整分析。

---

## 目录

- [1. 提示词文件结构](#1-提示词文件结构)
- [2. 静态提示词常量](#2-静态提示词常量)
  - [2.1 工作区布局 (Workspace Layout)](#21-工作区布局-workspace-layout)
  - [2.2 火力小组 (Fireteam)](#22-火力小组-fireteam)
  - [2.3 模式决策矩阵 (Mode Decision Matrix)](#23-模式决策矩阵-mode-decision-matrix)
  - [2.4 ReAct 系统提示词 (REACT_SYSTEM_PROMPT)](#24-react-系统提示词-react_system_prompt)
  - [2.5 待处理输出分析 (Pending Output Analysis)](#25-待处理输出分析-pending-output-analysis)
  - [2.6 计划波输出 (Pending Plan Outputs)](#26-计划波输出-pending-plan-outputs)
  - [2.7 阶段转换消息 (Phase Transition)](#27-阶段转换消息-phase-transition)
  - [2.8 用户提问消息 (User Question)](#28-用户提问消息-user-question)
  - [2.9 三级响应提示词体系](#29-三级响应提示词体系)
  - [2.10 文本转 Cypher 系统 (Text-to-Cypher)](#210-文本转-cypher-系统-text-to-cypher)
  - [2.11 深度思考 (Deep Think)](#211-深度思考-deep-think)
- [3. 动态提示词构建函数](#3-动态提示词构建函数)
- [4. 三级响应层级选择逻辑](#4-三级响应层级选择逻辑)
- [5. 总结提示词调用链路](#5-总结提示词调用链路)

---

## 1. 提示词文件结构

```
agentic/prompts/
├── __init__.py          # 导出所有提示词变量
├── base.py              # 主提示词定义文件（2650+ 行）
├── classification.py    # 分类相关提示词
└── tool_registry.py     # 工具注册表（被 base.py 引用）
```

所有核心提示词均定义在 `base.py` 中，通过 `__init__.py` 统一导出。

---

## 2. 静态提示词常量

### 2.1 工作区布局 (Workspace Layout)

**变量名：** `_WORKSPACE_LAYOUT_HEADER` + `_WORKSPACE_LAYOUT_FOOTER`

**用途：** 在每次 think-step 系统提示词的顶部渲染，为 Agent 提供稳定的工作区目录结构心智模型。

**核心内容：**

| 目录 | 角色 | 规则 |
|------|------|------|
| `notes/` | Agent 自由书写区 | 记录发现、草稿报告、构建 payload 文件 |
| `tool-outputs/` | 自动管理 | 仅读取（fs_read/fs_grep），不可直接写入 |
| `jobs/` | 自动管理 | 后台任务日志，仅读取 |
| `uploads/` | 用户收件箱 | 用户上传的文件，仅读取 |

**关键规则：**

- 外部工具（execute_*）使用绝对路径，fs_* 工具使用相对路径
- **禁止**向 execute_* 工具传递输出文件参数（`-o`/`--output-file` 等），因为它们运行在独立容器中
- 超过 20KB 的输出自动卸载到 `tool-outputs/`，Agent 通过 fs_read/fs_grep 查看
- 持久化文件（cookie jar、下载文件等）必须使用工作区路径，不可使用 `/tmp`
- 详细的 job_spawn 策略：何时 spawn（>60s）、何时不用（<2s）、何时会丢失实时进度

**模板变量：** `__WORKSPACE_ROOT__`（由 `build_workspace_layout_block()` 替换为实际路径）

---

### 2.2 火力小组 (Fireteam)

**变量名：** `_FIRETEAM_PROMPT_BLOCK` + `_PROPENSITY_GUIDANCE`

**用途：** 定义 `deploy_fireteam` 并行推理能力的使用说明和倾向控制。

**核心概念：**

- Fireteam = **并行推理**（每个专家独立 ReAct 循环），而非仅仅是并行工具调用（那是 plan_tools）
- 使用条件：任务可拆分为 ≥2 个独立子任务，每个需 ≥3 次工具调用
- 禁用条件：共享会话/凭据/Meterpreter 上下文的子任务，或子任务本身需要再次分叉

**升级路径（成本递增）：** `use_tool` → `plan_tools` → `deploy_fireteam`

| 方式 | 特点 | 适用场景 |
|------|------|----------|
| `plan_tools` | 一次 LLM 调用分析所有输出，共享上下文 | 已知 N 个工具并行执行，合并解读结果 |
| `deploy_fireteam` | N 个子 Agent 独立推理 | 每个子任务需要自己的 think-act-observe 循环 |

**阶段模式：**

- **Informational 阶段：** 不同攻击面或同技术跨目标
- **Exploitation 阶段：** 独立漏洞类（SQLi/SSRF/auth-bypass），不可对 Metasploit 分叉（单例竞争）
- **Post-exploitation 阶段：** 仅并行研究/规划，多会话 msfconsole 需串行

**`tools` 字段约定：** 每个成员指定 2-5 个主要工具名（必须使用注册表中的规范名称），范围外工具为 fallback 需显式说明理由。`query_graph` 始终隐式可用。

**倾向控制 (`_PROPENSITY_GUIDANCE`)：**

| 级别 | 标签 | 行为 |
|------|------|------|
| 1/5 | 非常保守 | 仅在极端复杂（≥3 独立面，每个 ≥5 迭代）时部署 |
| 2/5 | 保守 | 仅在 ≥2 独立子任务每个 ≥4 迭代时部署 |
| 3/5 | 基线（默认） | 不附加额外指导 |
| 4/5 | 积极 | 任何独立并行角度都倾向分叉 |
| 5/5 | 激进 | 任何可拆分的任务都分叉，仅线性任务使用 plan_tools |

**模板变量：** `{max_members}`（每波最大成员数，默认 5）

---

### 2.3 模式决策矩阵 (Mode Decision Matrix)

**变量名：** `MODE_DECISION_MATRIX`

**用途：** 说明当前会话模式（Statefull/Stateless）对 TARGET 类型和后渗透操作的影响。

| 模式 | 会话类型 | TARGET 类型 | 后渗透 |
|------|----------|-------------|--------|
| **Statefull** | Meterpreter/shell | Dropper/Staged/Meterpreter | 交互式命令、文件操作 |
| **Stateless** | 无（仅输出） | Command/In-Memory/Exec | 重新运行 exploit 携带新 CMD |

**模板变量：** `{mode}`, `{target_types}`, `{post_expl_note}`

---

### 2.4 ReAct 系统提示词 (REACT_SYSTEM_PROMPT)

**变量名：** `REACT_SYSTEM_PROMPT`

**用途：** **核心系统提示词**，定义 AI 渗透测试助手的完整行为规范。这是 Agent 每次迭代的主提示词。

**结构：**

分为**缓存前缀**（由 `CACHE_PREFIX_END_MARKER` 分隔）和**动态后缀**两部分：

**缓存前缀（跨迭代稳定，可被 Anthropic prompt caching 缓存）：**

1. **角色定义：** AI 渗透测试助手，使用 ReAct 框架
2. **操作模式：** Thought → Action → Observation → Reflection 循环
3. **当前阶段：** `{current_phase}` + 阶段定义
4. **编排器自动逻辑：** 阶段转换规则、会话自动检测等
5. **意图检测 + 图优先策略**（仅 informational 阶段）
6. **可用工具表：** 由动态函数构建
7. **攻击技能：** 攻击路径行为指导

**动态后缀（每次迭代变化）：**

1. 当前迭代/最大迭代
2. 当前目标 + 历史目标
3. 攻击链历史 + 当前进度
4. Todo 列表
5. 已知目标情报
6. 问答历史
7. **JSON 输出格式规范**（action 类型及示例）
8. tool_args 四种形状说明（Shape A/B/C/D）
9. 完成触发条件
10. 工具参数参考
11. 重要规则

**支持的 action 类型：**

| Action | 说明 |
|--------|------|
| `use_tool` | 调用单个工具 |
| `plan_tools` | 并行调用多个独立工具（一次 LLM 调用分析） |
| `deploy_fireteam` | 分叉多个子 Agent（条件启用） |
| `transition_phase` | 请求阶段转换 |
| `complete` | 完成当前目标 |
| `ask_user` | 向用户提问 |

**tool_args 四种形状：**

| 形状 | 格式 | 适用工具 |
|------|------|----------|
| **Shape A** | `{"args": "<CLI 标志字符串>"}` | cve_intel, execute_nuclei/curl/httpx/naabu/jsluice/katana/subfinder/gau/nmap/amass/hydra/wpscan/arjun/ffuf |
| **Shape B** | `{"command": "<完整 shell 命令>"}` | kali_shell, metasploit_console |
| **Shape C** | 类型化 kwargs（多键 JSON 对象） | query_graph, web_search, google_dork, shodan, execute_code, execute_playwright, tradecraft_lookup |
| **Shape D** | 无参数 | msf_restart |

**关键标记：** `CACHE_PREFIX_END_MARKER = "<<REDAMON_CACHE_PREFIX_END>>"` — 用于 think_node 分割系统提示词，LLM 不会看到此标记。

---

### 2.5 待处理输出分析 (Pending Output Analysis)

**变量名：** `PENDING_OUTPUT_ANALYSIS_SECTION`

**用途：** 当单个工具执行完成后注入系统提示词，要求 Agent 分析工具输出并生成结构化的 `output_analysis` 对象。

**注入时机：** 单个工具执行完毕后的下一次迭代

**`output_analysis` 结构：**

| 字段 | 说明 |
|------|------|
| `interpretation` | 输出说明了什么 |
| `extracted_info` | 提取的结构化信息（primary_target, ports, services, technologies, vulnerabilities, credentials, sessions） |
| `actionable_findings` | 需要跟进的发现 |
| `recommended_next_steps` | 建议的下一步 |
| `exploit_succeeded` | 漏洞利用是否成功 |
| `exploit_details` | 利用详情（仅成功时） |
| `chain_findings` | 攻击链发现列表（finding_type, severity, title, evidence, related_cves, related_ips, confidence） |
| `productivity` | 生产力判定 |

**生产力判定（Productivity Verdict）— 用于循环检测：**

| 判定 | 含义 |
|------|------|
| `new_info` | 输出揭示了新信息 |
| `confirmation` | 仅为已有假设增加确认 |
| `no_progress` | 成功但无可利用信息 |
| `blocked` | WAF/401/403/captcha/限速 |
| `duplicate` | 输出与近期调用基本相同 |

> 3 次以上同模式调用标记为 `confirmation` 会被自动降级为 `no_progress`。

**模板变量：** `{tool_name}`, `{tool_args}`, `{success}`, `{tool_output}`

---

### 2.6 计划波输出 (Pending Plan Outputs)

**变量名：** `PENDING_PLAN_OUTPUTS_SECTION`

**用途：** 当 `plan_tools` 批量工具执行完成后注入，要求 Agent 综合分析所有工具输出。

**与单工具的区别：**

- 要求对**所有输出进行整体分析**
- 生产力判定基于整个波（wave）
- `what_was_new` 需要引用至少一个工具输出的具体证据

**模板变量：** `{n_tools}`, `{tool_outputs_section}`

---

### 2.7 阶段转换消息 (Phase Transition)

**变量名：** `PHASE_TRANSITION_MESSAGE`

**用途：** Agent 请求阶段转换时，展示给用户审批的消息模板。

**模板变量：**

| 变量 | 说明 |
|------|------|
| `{from_phase}` | 当前阶段 |
| `{to_phase}` | 目标阶段 |
| `{reason}` | 转换原因 |
| `{planned_actions}` | 计划执行的操作 |
| `{risks}` | 潜在风险 |

**用户响应选项：** Approve / Modify / Abort

---

### 2.8 用户提问消息 (User Question)

**变量名：** `USER_QUESTION_MESSAGE`

**用途：** Agent 需要向用户提问时使用的消息模板。

**模板变量：**

| 变量 | 说明 |
|------|------|
| `{question}` | 问题内容 |
| `{context}` | 为什么需要提问 |
| `{format}` | 期望的回答格式 |
| `{options}` | 可选项 |
| `{default}` | 默认值 |

---

### 2.9 三级响应提示词体系

系统中定义了 **3 个层级的最终总结提示词**，由 `determine_response_tier()` 函数根据执行轨迹动态选择：

| 层级 | 变量名 | 触发条件 | 说明 |
|------|--------|----------|------|
| **Tier 1** | `CONVERSATIONAL_RESPONSE_PROMPT` | 无工具调用 / 仅查询图数据库 | 对话式直接回答，无报告结构 |
| **Tier 2** | `SUMMARY_RESPONSE_PROMPT` | 少量工具调用，未达到利用阶段 | 简短摘要，按攻击类型分支 |
| **Tier 3** | `FINAL_REPORT_PROMPT` | 进入利用阶段且工具调用 ≥ 5 次，或发现凭据/会话 | 完整渗透测试报告，包含七个章节 |

所有三个提示词均要求**以简体中文**输出。

#### Tier 1: 对话式响应 (CONVERSATIONAL)

**变量名：** `CONVERSATIONAL_RESPONSE_PROMPT`

**触发场景：** 用户提出信息查询请求，没有或仅进行了被动图数据库查询。

**提示词模板变量：**

| 变量 | 说明 |
|------|------|
| `{objective}` | 用户原始请求 |
| `{completion_reason}` | 完成原因 |
| `{execution_trace}` | 执行轨迹数据 |
| `{target_info}` | 目标情报 |

**输出要求：**
- 以清晰、对话式语气回答
- 可使用 Markdown 格式（表格、列表）
- **不使用**编号章节的报告结构
- **不包含**"建议"、"限制"或"摘要"标题
- 简洁直接，不是报告

**适用场景示例：**
- "目标 192.168.1.1 开了哪些端口？"
- "图数据库里有什么关于 example.com 的信息？"

#### Tier 2: 简短摘要 (SUMMARY)

**变量名：** `SUMMARY_RESPONSE_PROMPT`

**触发场景：** 有工具调用但未达到完整报告的标准，或钓鱼/社会工程学、拒绝服务攻击类型。

**提示词模板变量：**

| 变量 | 说明 |
|------|------|
| `{objective}` | 原始目标 |
| `{completion_reason}` | 完成原因 |
| `{attack_path_type}` | 攻击路径类型 |
| `{iteration_count}` | 迭代次数 |
| `{final_phase}` | 最终阶段 |
| `{execution_trace}` | 执行轨迹 |
| `{target_info}` | 目标情报 |

**输出结构（按攻击类型分支）：**

**钓鱼/社会工程学：**
1. **载荷详情**：生成的载荷类型、格式、文件名、位置
2. **处理器状态**：处理器是否运行、端口/载荷
3. **投递方式**：如何投递（文件下载、邮件、Web 投递 URL）

**侦察/扫描：**
1. **摘要**：发现了什么
2. **关键发现**：带详情的重要结果

**其他攻击路径：**
1. **摘要**：完成的工作概述
2. **关键发现**：最重要的发现
3. **下一步**：后续可执行的操作（如有）

**输出要求：** 最多 2-3 个简短章节，除非关键失败否则不包含"限制"章节。

#### Tier 3: 完整报告 (FULL_REPORT)

**变量名：** `FINAL_REPORT_PROMPT`

**触发场景：** 进入利用阶段且工具调用 ≥ 5 次，或 CVE利用/暴力破解攻击发现了凭据或会话。

**提示词模板变量：**

| 变量 | 说明 |
|------|------|
| `{objective}` | 原始目标 |
| `{iteration_count}` | 迭代次数 |
| `{final_phase}` | 最终阶段 |
| `{completion_reason}` | 完成原因 |
| `{execution_trace}` | 执行轨迹 |
| `{target_info}` | 目标情报 |
| `{todo_list}` | 待办事项最终状态 |

**输出结构（七个章节）：**

1. **摘要 (Summary)**：完成工作的简要概述
2. **关键发现 (Key Findings)**：最重要的发现
3. **发现的凭据 (Discovered Credentials)**：暴力破解中发现的有效凭据
4. **建立的会话 (Sessions Established)**：成功利用后建立的活跃会话
5. **发现的漏洞 (Vulnerabilities Found)**：漏洞列表及严重程度
6. **建议 (Recommendations)**：下一步操作或修复建议
7. **局限性 (Limitations)**：无法测试或验证的内容

---

### 2.10 文本转 Cypher 系统 (Text-to-Cypher)

**变量名：** `TEXT_TO_CYPHER_SYSTEM`

**用途：** 为 `query_graph` 工具提供完整的 Neo4j Cypher 查询专家系统提示词，定义了安全侦察图数据库的完整 Schema。

**这是整个文件中最大的提示词**（约 1100 行），包含：

**节点类型体系：**

| 分类 | 节点 | 层级关系 |
|------|------|----------|
| **基础设施** | Domain → Subdomain → IP → Port → Service | 层级递进 |
| **Web 应用** | BaseURL → Endpoint → Parameter | 层级递进 |
| **技术/安全** | Technology, Header, Certificate, DNSRecord, Secret | 独立节点 |
| **漏洞/CVE** | Vulnerability (扫描器发现) + CVE (NVD 已知) | 两种不同节点！ |
| **MITRE** | MitreData (CWE/ATT&CK), Capec | 攻击模式 |
| **GVM 利用** | ExploitGvm | 确认的主动利用 |
| **攻击链** | AttackChain → ChainStep → ChainFinding/ChainFailure/ChainDecision | 执行历史 |
| **TruffleHog** | TrufflehogScan → TrufflehogRepository → TrufflehogFinding | 密钥扫描 |
| **JS 侦察** | JsReconFinding (js_file + 具体发现) | JS 分析结果 |
| **威胁情报** | ThreatPulse, Malware, ExternalDomain | OTX/VT 威胁数据 |
| **用户输入** | UserInput | 部分侦察的用户数据 |
| **网络路由** | Traceroute | GVM 路由追踪 |
| **VHost/SNI** | 包含在 Vulnerability 中 (source="vhost_sni_enum") | 隐藏虚拟主机 |
| **子域名接管** | 包含在 Vulnerability 中 (source="takeover_scan") | 接管检测 |

**关键设计要点：**

- "漏洞"可能指 Vulnerability 节点（扫描器发现）或 CVE 节点（NVD 已知），查询时需用 UNION 涵盖两种
- Vulnerability 节点按来源细分：nuclei(DAST/web)、gvm(网络/OpenVAS)、security_check、netlas(被动)、graphql_scan/graphql_cop、takeover_scan、vhost_sni_enum
- JS 侦察 Phase 6 新增 AI SDK 检测（ai-sdk-client, ai-sdk-key-literal, ai-sdk-browser-allowed 等）
- 攻击链节点记录完整的 Agent 执行历史，通过桥接关系连接到侦察图

**关系体系：** 定义了 60+ 种关系，包括基础设施关系、威胁情报关系、Web 应用关系、技术关系、安全关系、漏洞关系、攻击链关系等。

**常见查询模式：** 提供了大量 Cypher 查询示例，覆盖：
- 全量漏洞查询（UNION 两种节点）
- 扫描器漏洞 / CVE 查找
- 目标信息查询
- 技术栈枚举
- 子域名/端点/参数查找
- 密钥和敏感信息
- 攻击链遍历

---

### 2.11 深度思考 (Deep Think)

**变量名：** `DEEP_THINK_PROMPT` + `DEEP_THINK_SECTION` + `DEEP_THINK_SELF_REQUEST_INSTRUCTION`

**用途：** 在关键决策点触发深度战略分析，帮助 Agent 从困局中突破或选择最优攻击向量。

#### DEEP_THINK_PROMPT

**触发方式：** 自动触发（非生产性连续检测）或 Agent 自主请求（`need_deep_think: true`）

**模板变量：**

| 变量 | 说明 |
|------|------|
| `{current_phase}` | 当前阶段 |
| `{objective}` | 当前目标 |
| `{attack_path_type}` | 攻击路径类型 |
| `{iteration}/{max_iterations}` | 迭代进度 |
| `{trigger_reason}` | 触发原因 |
| `{phase_definitions}` | 阶段定义 |
| `{attack_path_behavior}` | 攻击路径行为 |
| `{target_info}` | 目标情报 |
| `{chain_context}` | 攻击链进度 |
| `{objective_history}` | 目标历史 |
| `{todo_list}` | 任务列表 |
| `{session_config}` | 会话配置 |
| `{roe_section}` | 交战规则 |

**输出 JSON 结构：**

| 字段 | 说明 |
|------|------|
| `situation_assessment` | 当前态势评估 |
| `competing_hypotheses` | 竞争假设列表（必须 ≥2 个） |
| `attack_vectors_identified` | 已识别的攻击向量 |
| `recommended_approach` | 推荐策略及理由 |
| `priority_order` | 优先执行顺序 |
| `risks_and_mitigations` | 风险与缓解措施 |

**竞争假设机制（关键设计）：**

- 当触发原因为"非生产性连续检测"或链发现置信度 ≥ 60 时，**必须**枚举 ≥2 个竞争假设
- 每个假设包含三个字段：
  - `hypothesis`：一句话解释
  - `supporting_evidence`：支持证据
  - `disambiguating_probe`：一个可以区分假设的探测测试
- 这确保 Agent 不会陷入确认偏误，而是用实验方法区分假设

#### DEEP_THINK_SECTION

**用途：** 将深度思考结果注入后续迭代的系统提示词，指导 Agent 跟随分析结果，除非新信息使其失效。

**模板变量：** `{deep_think_result}`

#### DEEP_THINK_SELF_REQUEST_INSTRUCTION

**用途：** 注入 REACT_SYSTEM_PROMPT，告诉 Agent 可以自主触发深度思考。

**触发条件：**
- 陷入循环（重复相似工具无新结果）
- 没有实质进展（工具成功但无可操作发现）
- 不确定攻击向量方向
- 遇到障碍（多种方法都失败）

**触发方式：** 在 JSON 输出中设置 `"need_deep_think": true`

---

## 3. 动态提示词构建函数

| 函数 | 用途 | 输出 |
|------|------|------|
| `build_workspace_layout_block(project_id)` | 构建工作区布局块，含 uploads 列表 | 渲染后的 Workspace Layout 文本 |
| `build_tool_availability_table(phase, allowed_tools)` | 构建当前阶段可用工具表格 | Markdown 表格 |
| `build_informational_tool_descriptions(allowed_tools)` | 构建允许工具的详细描述 | 编号列表 |
| `build_tool_args_section(allowed_tools)` | 构建工具参数参考 | 参数格式列表 |
| `build_compact_tool_list(allowed_tools)` | 构建精简工具列表（用于 Fireteam 成员 fallback 工具） | 名称:用途 列表 |
| `build_fireteam_prompt_fragments(enabled, phase, allowed_phases, max_members, propensity)` | 构建 Fireteam 相关的三个片段 | (action_enum, plan_field, example) 三元组 |
| `build_tool_name_enum(allowed_tools)` | 构建 JSON 示例中的工具名枚举字符串 | 逗号分隔的工具名 |
| `build_phase_definitions()` | 构建阶段定义（Informational/Exploitation/Post-Exploitation） | Markdown 格式阶段说明 |
| `build_attack_path_behavior(attack_path_type)` | 构建当前攻击路径的行为规则 | 攻击路径特定指导 |
| `build_kali_install_prompt()` | 构建Kali Shell 安装规则（从项目设置读取） | 允许/禁止安装的提示 |
| `build_roe_prompt_section()` | 构建交战规则 (RoE) 提示（从项目设置读取） | 完整 RoE 文档 |
| `build_informational_guidance(phase)` | 构建意图检测+图优先策略（仅 informational 阶段） | 意图分类和行动指导 |

### 关键构建函数详解

#### `build_attack_path_behavior(attack_path_type)`

根据攻击路径类型返回不同的行为规则：

| 攻击路径 | 行为规则 |
|----------|----------|
| `brute_force_credential_guess` | 跳过用户名/凭据侦察，直接使用默认词表 |
| `cve_exploit` | 信息阶段收集目标信息后快速请求进入利用阶段 |
| `denial_of_service` | 不进入后渗透阶段（DoS 不提供访问） |
| `xss` | 完整 XSS 工作流（canary → kxss → payload → Playwright 证明 → dalfox WAF 绕过） |
| `user_skill:*` | 遵循技能定义的工作流 |
| `*-unclassified` | 通用工作流，无强制步骤 |

#### `build_roe_prompt_section()`

从项目设置中读取完整的交战规则，包括：

- 客户信息与联系方式
- 排除的主机（NEVER TOUCH）
- 允许的时间窗口
- 测试权限（DoS、社会工程、物理访问、数据外泄、账户锁定、生产测试）
- 禁止的工具和类别
- 最大允许阶段
- 全局速率限制
- 敏感数据处理策略
- 合规框架
- 第三方服务商
- 状态更新频率
- 事件响应程序
- 原始 RoE 文档摘录（最多 3000 字符）

#### `build_informational_guidance(phase)`

仅在 informational 阶段注入，按意图分类行动：

| 意图类型 | 关键词 | 行动 |
|----------|--------|------|
| **利用意图** | "exploit", "pwn", "run exploit" | 查图一次 → 请求阶段转换 |
| **载荷/处理器意图** | "generate", "payload", "reverse shell" | 直接请求阶段转换 |
| **研究意图** | "find", "show", "list", "scan" | 图优先查询，仅补充验证 |

---

## 4. 三级响应层级选择逻辑

`determine_response_tier()` 函数定义在 `agentic/prompts/base.py` 中，决策流程如下：

```
输入: execution_trace, attack_path_type, target_info, objective_history
  │
  ├─ 钓鱼/社会工程学 或 拒绝服务攻击？
  │   └─ ✅ 返回 "summary" (Tier 2)
  │
  ├─ 工具调用次数 == 0？
  │   └─ ✅ 返回 "conversational" (Tier 1)
  │
  ├─ 仅使用图数据库查询 且 未到达利用阶段？
  │   └─ ✅ 返回 "conversational" (Tier 1)
  │
  ├─ 到达利用阶段 且 工具调用次数 ≥ 5？
  │   └─ ✅ 返回 "full_report" (Tier 3)
  │
  ├─ 攻击类型为 CVE利用 或 暴力破解，且发现凭据或会话？
  │   └─ ✅ 返回 "full_report" (Tier 3)
  │
  └─ 其他所有情况
      └─ 返回 "summary" (Tier 2)
```

**关键判定因素：**

- **工具调用次数**：仅统计当前目标的工具调用（排除之前目标已完成的步骤）
- **活跃工具**：排除 `query_graph`（被动查询），仅统计主动工具
- **阶段判断**：检查执行轨迹中是否到达 `exploitation` 或 `post_exploitation` 阶段
- **凭据/会话**：检查 `target_info` 中是否包含 `credentials` 或 `sessions`

---

## 5. 总结提示词调用链路

```
用户请求
  │
  ▼
agentic/orchestrator_helpers/nodes/generate_response_node.py
  │
  ├─ 调用 determine_response_tier()
  │   输入: execution_trace, attack_path_type, target_info, objective_history
  │   输出: "conversational" | "summary" | "full_report"
  │
  ├─ 根据返回值选择提示词模板
  │   "conversational" → CONVERSATIONAL_RESPONSE_PROMPT
  │   "summary"        → SUMMARY_RESPONSE_PROMPT
  │   "full_report"    → FINAL_REPORT_PROMPT
  │
  ├─ 填充模板变量
  │
  └─ 发送给 LLM 生成最终响应
```

**主要提示词注入链路：**

```
REACT_SYSTEM_PROMPT 构建流程
  │
  ├─ 缓存前缀（跨迭代稳定）
  │   ├─ 工作区布局: build_workspace_layout_block()
  │   ├─ 阶段定义: build_phase_definitions()
  │   ├─ 意图检测: build_informational_guidance()
  │   ├─ 可用工具: build_tool_availability_table()
  │   ├─ 攻击技能: build_attack_path_behavior()
  │   ├─ Fireteam: build_fireteam_prompt_fragments()
  │   ├─ Kali 安装: build_kali_install_prompt()
  │   └─ 交战规则: build_roe_prompt_section()
  │
  ├─ CACHE_PREFIX_END_MARKER 分割点
  │
  └─ 动态后缀（每次迭代变化）
      ├─ 迭代/目标/历史
      ├─ 攻击链进度
      ├─ Todo 列表
      ├─ 目标情报
      ├─ 输出分析: PENDING_OUTPUT_ANALYSIS_SECTION / PENDING_PLAN_OUTPUTS_SECTION
      ├─ 深度思考: DEEP_THINK_SECTION
      ├─ 深度思考自请求: DEEP_THINK_SELF_REQUEST_INSTRUCTION
      └─ 工具参数: build_tool_args_section()
```

**调用入口：** `generate_response_node.py` 中的 `generate_response()` 函数
**提示词定义：** `agentic/prompts/base.py`
**导出模块：** `agentic/prompts/__init__.py`
