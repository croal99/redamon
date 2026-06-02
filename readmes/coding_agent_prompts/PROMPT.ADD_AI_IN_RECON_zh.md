# 提示词 — 为侦察工具添加 AI 钩子

将 LLM 接入侦察工具的决策过程（例如"让 AI 为 {TOOL} 选择 {FEATURE}"）。
参照现有实现进行镜像复制；不要发明新模式。

## 开始之前

**先了解侦察管线的工作方式。** 阅读相关入口点，追踪你要修改的工具是如何被调用的：
- 完整管线：`recon/main.py` → `recon/main_recon_modules/*.py`。
- 部分侦察：`recon/partial_recon.py` → `recon/partial_recon_modules/*.py`。
- 设置流转：`recon/project_settings.py`（`get_settings`，级联机制）。
- 容器启动：`recon_orchestrator/container_manager.py`（主侦察和部分侦察分别启动）。

该功能**必须同时在完整管线和部分侦察中正常工作。** 确认两条路径都通过之前不要提交。

## 参考实现

选择更接近的模板，端到端复制其结构：

- **按目标**（AI 对每个 URL/主机调用一次）：FFuf —
  `recon/helpers/ai_planner/ffuf_extensions.py`。**必须使用缓存**，以技术指纹（Server、X-Powered-By 等）为键，这样同一技术栈后面的 N 个目标会合并为一次 LLM 调用。没有缓存会消耗 N 倍预算。
- **按扫描**（AI 对聚合指纹每次扫描调用一次）：Nuclei —
  `recon/helpers/ai_planner/nuclei_tags.py`。**不需要缓存** — 只有一次调用。（候选池的模块级记忆化是另一个问题，与此不同。）

经验法则：如果你的钩子在每个目标的循环内运行，就缓存。如果在工具主命令构建前只运行一次，就不需要。

## 操作步骤

1. **辅助模块** 放在 `recon/helpers/ai_planner/{tool}_{feature}.py`。向 agent 的
   `/llm/{tool}-{feature}` 端点发送 POST 请求。从环境变量读取 `AGENT_API_URL`。
   **永远不抛出异常** — 每个失败路径都返回用户当前的值。
   所有日志行必须是 `print(...)`（标准输出），正常事件前缀为 `[*][{Tool}-AI]`，
   警告/回退前缀为 `[!][{Tool}-AI]`。侦察容器的标准输出是 webapp 通过 SSE 流
   实时显示在侦察抽屉中的内容 — 不在标准输出的内容用户看不到。
2. **Agent 端点** 放在 `agentic/api.py`。新建 Pydantic 请求模型 + 系统提示词。
   复用 `_build_llm_with_model_for_user(model, user_id)`。
3. **设置项** 放在 `recon/project_settings.py`：将 `{TOOL}_AI_{FEATURE}` 加入
   `DEFAULT_SETTINGS`，在 `fetch_project_settings` 中映射 `{tool}Ai{Feature}` →
   `{TOOL}_AI_{FEATURE}`，并将其添加到 `apply_ai_pipeline_overrides` 的**两个分支**
   （`aiInPipeline` 主级联）。
4. **将 AI 代码块钩入**工具的主入口函数。该功能**必须覆盖完整管线和部分侦察**。
   大多数工具共享一个入口函数（例如 `run_vuln_scan` 同时被 `main_recon_modules/vuln_scan.py`
   和 `partial_recon_modules/vulnerability_scanning.py` 调用）— 钩在那里一次，两条路径都继承。
   如果工具有独立的入口函数，则都要钩入。通过 `grep` 函数名来验证。
5. **Prisma**：在 `Project` 中添加 `{tool}Ai{Feature} Boolean @default(false) @map("{tool}_ai_{feature}")`。
   通过 `prisma db push` 应用（如果 push 想要删除无关表，则用 `ALTER TABLE` +
   `prisma generate` — 绝不使用 `--accept-data-loss`）。
6. **Zod**：将字段添加到 `webapp/src/lib/recon-preset-schema.ts`（并在目录注释中加一行说明），
   以便 AI 生成的预设能看到它。
7. **UI：开关必须存在于两处，绑定到同一个表单字段，以便自动保持同步（双向）。**

   - **位置 A — `TargetSection.tsx`（主"AI in Pipeline"面板）**：在现有 FFuf 行旁添加
     每个工具的开关行，仅在 `data.aiInPipeline` 开启时可见。同时扩展主 `aiInPipeline`
     的 `onChange` 处理器，使其级联到 `{tool}Ai{Feature}`。
   - **位置 B — 工具自身的模块区域**（如 `NucleiSection.tsx`）：工具设置面板内的开关，
     `disabled={!data.aiInPipeline}`，开启时将其替代的静态输入（如标签列表）置灰/禁用。

   **两个开关必须绑定到同一个表单字段** `data.{tool}Ai{Feature}`（读写均是）。
   **不要**在翻转时在它们之间复制值。因为它们共享同一字段，翻转任一开关都会自动
   反映到另一个。如果你发现自己写了翻转时的复制逻辑，那就做错了 — 修正绑定方式。
8. **测试**：复制 Nuclei 的四个测试文件（`test_nuclei_ai_planner.py`、
   `test_nuclei_ai_pipeline_integration.py`、`test_nuclei_ai_vuln_scan_wiring.py`、
   `test_nuclei_ai_smoke.py`）并修改名称。在侦察镜像内运行。
9. **Wiki**：扩展 `redamon.wiki/Recon-Pipeline-Workflow.md`，**"AI in Pipeline"** 部分：
   - 在"三个现有 AI 钩子"表格中添加一行（工具 / 模式 / 替代项）。
   - 添加 `#### {Tool}: {Feature}` 子章节，参照现有的 FFuf、Nuclei 和 WAF 条目：
     一段描述其功能，然后是项目列表，包含辅助模块路径、agent 端点、设置键和典型影响。
   - 如果 Target 标签页的 AI 面板布局发生变化，更新截图（将刷新后的
     `ai-in-pipeline-target-tab.png` 放入 `redamon.wiki/images/`）。

## 禁止事项

- **不要修改 `webapp/src/lib/recon-presets/presets/` 下的任何文件。** 级联是唯一
  真实来源；预设不能硬编码每个工具的 AI 标志。更新 Zod schema（步骤 6）就足够了。
- **不要返回空列表/空字符串作为回退值。** 对于空值意味着"跳过工作"的工具
  （Nuclei 标签、FFuf 扩展），这会静默关闭检测。始终回退到用户当前的值。
- **没有信号时不要调用 AI。** 空指纹 → 返回当前值，不要用空提示词调用 LLM。
- **不要在部分侦察中单独钩入 AI。** 找到共享入口点（`run_vuln_scan`、
  `run_ffuf_discovery` 等）钩入一次。

## 重建

- `agentic/api.py` → 重建 **agent**。
- `recon_orchestrator/*.py` → 重建 **recon-orchestrator**。
- `recon/*.py` → 无需操作（卷挂载）。
- Prisma schema → `prisma db push` + `prisma generate -u root`。
- `webapp/src/*` → 重建 **webapp**（生产模式）或无需操作（开发模式）。

## 验证

1. 测试通过。
2. `curl -X POST http://localhost:8090/llm/{tool}-{feature}` 携带最小请求体
   返回 422（请求体错误）或 503（无 API 密钥），绝不会返回 500。
3. Target 面板的主开关翻转时，工具开关随之翻转，反之亦然。
4. 实时扫描日志在完整管线运行和部分侦察运行中**都**显示
   `[*][{Tool}-AI] ...` 行。
5. 停止 agent → 扫描仍能使用用户的静态值完成。
