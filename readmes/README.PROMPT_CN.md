# Agentic Prompts 提示词分析

> 本文档对 `agentic/prompts/` 目录下的提示词系统进行分析，重点介绍用于"最后总结"的三级响应提示词体系。

---

## 目录

- [1. 提示词文件结构](#1-提示词文件结构)
- [2. 最后总结：三级响应提示词体系](#2-最后总结三级响应提示词体系)
  - [2.1 层级选择逻辑](#21-层级选择逻辑)
  - [2.2 Tier 1: 对话式响应 (CONVERSATIONAL)](#22-tier-1-对话式响应-conversational)
  - [2.3 Tier 2: 简短摘要 (SUMMARY)](#23-tier-2-简短摘要-summary)
  - [2.4 Tier 3: 完整报告 (FULL_REPORT)](#24-tier-3-完整报告-full_report)
- [3. 总结提示词调用链路](#3-总结提示词调用链路)

---

## 1. 提示词文件结构

```
agentic/prompts/
├── __init__.py          # 导出所有提示词变量
├── base.py              # 主提示词定义文件
└── classification.py    # 分类相关提示词
```

所有核心提示词均定义在 `base.py` 中，通过 `__init__.py` 统一导出。

---

## 2. 最后总结：三级响应提示词体系

系统中定义了 **3 个层级的最终总结提示词**，由 `determine_response_tier()` 函数根据执行轨迹动态选择：

| 层级 | 变量名 | 触发条件 | 说明 |
|------|--------|----------|------|
| **Tier 1** | `CONVERSATIONAL_RESPONSE_PROMPT` | 无工具调用 / 仅查询图数据库 | 对话式直接回答，无报告结构 |
| **Tier 2** | `SUMMARY_RESPONSE_PROMPT` | 少量工具调用，未达到利用阶段 | 简短摘要，按攻击类型分支 |
| **Tier 3** | `FINAL_REPORT_PROMPT` | 进入利用阶段且工具调用 ≥ 5 次，或发现凭据/会话 | 完整渗透测试报告，包含七个章节 |

### 2.1 层级选择逻辑

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

### 2.2 Tier 1: 对话式响应 (CONVERSATIONAL)

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

### 2.3 Tier 2: 简短摘要 (SUMMARY)

**变量名：** `SUMMARY_RESPONSE_PROMPT`

**触发场景：** 有工具调用但未达到完整报告的标准（如未进入利用阶段、工具调用较少等），或钓鱼/社会工程学、拒绝服务攻击类型。

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

### 2.4 Tier 3: 完整报告 (FULL_REPORT)

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
3. **发现的凭据 (Discovered Credentials)**：暴力破解中发现的有效凭据（用户名:密码对 + 目标主机）
4. **建立的会话 (Sessions Established)**：成功利用后建立的活跃会话（会话 ID、类型、目标）
5. **发现的漏洞 (Vulnerabilities Found)**：漏洞列表及严重程度
6. **建议 (Recommendations)**：下一步操作或修复建议
7. **局限性 (Limitations)**：无法测试或验证的内容

---

## 3. 总结提示词调用链路

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

**调用入口：** `generate_response_node.py` 中的 `generate_response()` 函数
**提示词定义：** `agentic/prompts/base.py`
**导出模块：** `agentic/prompts/__init__.py`
