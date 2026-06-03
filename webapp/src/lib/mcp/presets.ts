/**
 * Prefilled MCP server templates — 10 publicly-available, security-relevant
 * MCP servers chosen for RedAmon's pentest workflow.
 *
 * Each preset fills `id, name, description, transport, url/command/args,
 * default_phases, auth structure, env structure` — but leaves `token` and
 * any user-specific values empty so the user just pastes their key (if
 * needed) and clicks Test → "+ add all" to auto-import discovered tools.
 *
 * URLs are verified live as of writing. The free auth requirements are
 * accurate; quotas/policies on the upstream services may change.
 */

import type { MCPServer } from './schema'

export type PresetCategory = 'osint' | 'research' | 'web' | 'security' | 'utility'

export interface McpPreset {
  /** Unique key for this preset (not the user's saved server id). */
  key: string
  /** Display label in the picker. */
  label: string
  category: PresetCategory
  /** Short blurb shown in the card. */
  blurb: string
  /** What this is useful for in a pentest context. */
  whyForRedamon: string
  /** Public docs / signup URL. */
  docsUrl: string
  /** Whether the user must paste an auth token before Test will succeed. */
  authRequired: boolean
  /** Friendly hint about how to obtain auth. */
  authHint?: string
  /** Fully-typed template merged into the new-server form on click. */
  template: MCPServer
}

const ALL_PHASES = ['informational', 'exploitation', 'post_exploitation'] as const

/** Stub helper — the form's `emptyServer()` shape we extend per preset. */
const baseTemplate = (overrides: Partial<MCPServer>): MCPServer => ({
  id: '',
  name: '',
  description: '',
  enabled: true,
  transport: 'streamable_http',
  default_phases: [...ALL_PHASES],
  tags: [],
  url: '',
  headers: {},
  auth: undefined,
  connect_timeout: 60,
  read_timeout: 600,
  command: '',
  args: [],
  env: {},
  cwd: '',
  encoding: 'utf-8',
  tools: [],
  ...overrides,
})

export const MCP_PRESETS: McpPreset[] = [
  // -------------------------------------------------------------------------
  // 1) DeepWiki — anonymous, easiest first test
  // -------------------------------------------------------------------------
  {
    key: 'deepwiki',
    label: 'DeepWiki',
    category: 'research',
    blurb: 'Cognition 的公开仓库问答：可对任意 GitHub 仓库进行自然语言提问。',
    whyForRedamon: '用于研究易受攻击的库、理解公开 PoC 仓库里的利用代码，在选定目标前审计依赖。',
    docsUrl: 'https://docs.devin.ai/work-with-devin/deepwiki-mcp',
    authRequired: false,
    template: baseTemplate({
      id: 'deepwiki',
      name: 'DeepWiki',
      description: '针对任意公开 GitHub 仓库的问答（无需认证）',
      transport: 'streamable_http',
      url: 'https://mcp.deepwiki.com/mcp',
      default_phases: ['informational'],
      tags: ['research', 'github'],
    }),
  },

  // -------------------------------------------------------------------------
  // 2) GitHub MCP (official) — code search, vulnerable-repo hunting
  // -------------------------------------------------------------------------
  {
    key: 'github',
    label: 'GitHub',
    category: 'osint',
    blurb: '官方 GitHub MCP：全站代码 / Issue / PR 搜索。',
    whyForRedamon: '查找漏洞利用 PoC、在公开仓库搜索凭据、识别易受攻击的代码模式、进行供应链分析。',
    docsUrl: 'https://github.com/github/github-mcp-server',
    authRequired: true,
    authHint: 'Generate a fine-grained PAT (read-only is enough): https://github.com/settings/personal-access-tokens',
    template: baseTemplate({
      id: 'github',
      name: 'GitHub',
      description: '官方 GitHub MCP：代码、Issue、PR、安全公告',
      transport: 'streamable_http',
      url: 'https://api.githubcopilot.com/mcp/',
      default_phases: ['informational', 'exploitation'],
      tags: ['osint', 'code', 'github'],
      auth: { type: 'bearer', token: '' },
    }),
  },

  // -------------------------------------------------------------------------
  // 3) Hugging Face — research papers, security ML, datasets
  // -------------------------------------------------------------------------
  {
    key: 'huggingface',
    label: 'Hugging Face',
    category: 'research',
    blurb: '搜索 Hugging Face 的模型、数据集、论文与 Spaces。',
    whyForRedamon: '查找安全研究论文（如最新 CVE 分析、利用技巧）、用于 fuzzing 的数据集、基于 ML 的漏洞检测工具。',
    docsUrl: 'https://huggingface.co/mcp',
    authRequired: true,
    authHint: 'Read-only token from https://huggingface.co/settings/tokens',
    template: baseTemplate({
      id: 'huggingface',
      name: 'Hugging Face',
      description: '搜索模型、数据集、论文与 Spaces',
      transport: 'streamable_http',
      url: 'https://huggingface.co/mcp',
      default_phases: ['informational'],
      tags: ['research', 'ml'],
      auth: { type: 'bearer', token: '' },
    }),
  },

  // -------------------------------------------------------------------------
  // 4) Context7 — up-to-date library documentation (Upstash)
  // -------------------------------------------------------------------------
  {
    key: 'context7',
    label: 'Context7',
    category: 'research',
    blurb: '最新的库/框架文档查询（Upstash 托管）。',
    whyForRedamon: '查询正在测试的库的最新 API（例如理解认证流程或确认已废弃/移除的防护）。',
    docsUrl: 'https://github.com/upstash/context7',
    authRequired: false,
    authHint: 'Optional: get a free API key from https://context7.com for higher rate limits',
    template: baseTemplate({
      id: 'context7',
      name: 'Context7',
      description: '库/框架文档查询（Upstash）',
      transport: 'streamable_http',
      url: 'https://mcp.context7.com/mcp',
      default_phases: ['informational', 'exploitation'],
      tags: ['research', 'docs'],
    }),
  },

  // -------------------------------------------------------------------------
  // 5) Brave Search — OSINT search alternative to Tavily/Google
  // -------------------------------------------------------------------------
  {
    key: 'brave_search',
    label: 'Brave Search',
    category: 'osint',
    blurb: '通过 Brave Search API 进行 Web + 本地搜索。',
    whyForRedamon: '独立的 OSINT 搜索引擎：当 Tavily/Google 触发限速或需要用不同索引交叉验证时很有用。',
    docsUrl: 'https://api.search.brave.com/',
    authRequired: true,
    authHint: 'Free tier 2k req/month at https://api.search.brave.com/app/keys',
    template: baseTemplate({
      id: 'brave_search',
      name: 'Brave Search',
      description: '通过 Brave Search API 的 Web/本地搜索（免费 2k/月）',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-brave-search'],
      env: { BRAVE_API_KEY: '' },
      default_phases: ['informational'],
      tags: ['osint', 'search'],
    }),
  },

  // -------------------------------------------------------------------------
  // 6) Fetch — fetch arbitrary URLs (HTTP body extraction, no auth)
  // -------------------------------------------------------------------------
  {
    key: 'fetch',
    label: 'Web Fetch',
    category: 'web',
    blurb: '抓取任意 URL 并抽取结构化内容。',
    whyForRedamon: '抓取目标页面、获取 CVE 公告、拉取博客/变更日志/发布说明——相当于带内容抽取的 curl。',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
    authRequired: false,
    template: baseTemplate({
      id: 'web_fetch',
      name: 'Web Fetch',
      description: '抓取 URL 并抽取结构化内容',
      transport: 'stdio',
      command: 'uvx',
      args: ['mcp-server-fetch'],
      default_phases: ['informational', 'exploitation'],
      tags: ['web'],
    }),
  },

  // -------------------------------------------------------------------------
  // 7) Memory — persistent knowledge graph across sessions
  // -------------------------------------------------------------------------
  {
    key: 'memory',
    label: 'Memory (knowledge graph)',
    category: 'utility',
    blurb: '智能体可读写的持久化实体-关系记忆。',
    whyForRedamon: '跨会话保存发现：记录已验证凭据、持久化 Shell、维护子域名 → CVE 关系等。',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
    authRequired: false,
    template: baseTemplate({
      id: 'memory',
      name: 'Memory',
      description: '跨会话的持久化知识图谱',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
      env: { MEMORY_FILE_PATH: '/app/logs/mcp_memory.json' },
      default_phases: [...ALL_PHASES],
      tags: ['utility', 'memory'],
    }),
  },

  // -------------------------------------------------------------------------
  // 8) Sequential Thinking — explicit step-by-step reasoning tool
  // -------------------------------------------------------------------------
  {
    key: 'sequential_thinking',
    label: 'Sequential Thinking',
    category: 'utility',
    blurb: '结构化多步推理工具——将智能体的思考过程外显。',
    whyForRedamon: '让 LLM 显式规划利用链：列出步骤、修正假设、记录决策点，便于审计与复盘。',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking',
    authRequired: false,
    template: baseTemplate({
      id: 'sequential_thinking',
      name: 'Sequential Thinking',
      description: '结构化的逐步推理 / 假设修正工具',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
      default_phases: [...ALL_PHASES],
      tags: ['utility', 'reasoning'],
    }),
  },

  // -------------------------------------------------------------------------
  // 9) Filesystem — read/write within a sandboxed agent-local dir
  // -------------------------------------------------------------------------
  {
    key: 'filesystem',
    label: 'Filesystem (sandboxed)',
    category: 'utility',
    blurb: '在智能体容器内的沙盒目录中读写文件。',
    whyForRedamon: '保存外带文件、逐步构建字典/载荷、跨迭代保存反弹 Shell 工件；目录限制在 /app/logs/sandbox。',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    authRequired: false,
    template: baseTemplate({
      id: 'filesystem',
      name: 'Filesystem',
      description: '在 /app/logs/sandbox 中进行沙盒文件操作（智能体容器内）',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/app/logs/sandbox'],
      default_phases: ['exploitation', 'post_exploitation'],
      tags: ['utility', 'fs'],
    }),
  },

  // -------------------------------------------------------------------------
  // 10) Time — timezone + timestamps (zero-friction smoke test)
  // -------------------------------------------------------------------------
  {
    key: 'time',
    label: 'Time & Timezones',
    category: 'utility',
    blurb: '当前时间 + 时区转换。体积小、无需认证、测试秒出结果。',
    whyForRedamon: '用于跨日志对齐时间戳、处理时区、做时区相关的凭据过期校验；也是验证 MCP 集成是否端到端可用的最佳入门预设。',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/time',
    authRequired: false,
    template: baseTemplate({
      id: 'time',
      name: 'Time',
      description: '时间与时区工具',
      transport: 'stdio',
      command: 'uvx',
      args: ['mcp-server-time', '--local-timezone=UTC'],
      default_phases: [...ALL_PHASES],
      tags: ['utility', 'time'],
    }),
  },

  // -------------------------------------------------------------------------
  // 11) Shodan — internet-wide host/port intel (heavy pentest staple)
  // -------------------------------------------------------------------------
  {
    key: 'shodan',
    label: 'Shodan',
    category: 'security',
    blurb: '通过 Shodan API 获取全网主机 / 端口 / banner 情报。',
    whyForRedamon: '绘制外部攻击面、发现暴露服务、无需触碰目标即可获取 banner；通过补充既有扫描数据与 CVE 匹配来增强 execute_naabu。',
    docsUrl: 'https://github.com/burtthecoder/mcp-shodan',
    authRequired: true,
    authHint: 'Shodan API key required. Free key at https://account.shodan.io/register',
    template: baseTemplate({
      id: 'shodan',
      name: 'Shodan',
      description: '通过 Shodan API 进行全网侦察',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@burtthecoder/mcp-shodan'],
      env: { SHODAN_API_KEY: '' },
      default_phases: ['informational'],
      tags: ['security', 'osint', 'recon'],
    }),
  },

  // -------------------------------------------------------------------------
  // 12) VirusTotal — file/URL/IP threat intel
  // -------------------------------------------------------------------------
  {
    key: 'virustotal',
    label: 'VirusTotal',
    category: 'security',
    blurb: '通过 VirusTotal API 查询文件哈希 / URL / IP / 域名信誉。',
    whyForRedamon: '对扫描中发现的可疑工件进行分流与验证，外带回连前检查 IP 信誉，识别托管在目标子域上的已知恶意域名。',
    docsUrl: 'https://github.com/burtthecoder/mcp-virustotal',
    authRequired: true,
    authHint: 'Free public API key at https://www.virustotal.com/gui/my-apikey',
    template: baseTemplate({
      id: 'virustotal',
      name: 'VirusTotal',
      description: '文件 / URL / IP / 域名信誉分析',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@burtthecoder/mcp-virustotal'],
      env: { VIRUSTOTAL_API_KEY: '' },
      default_phases: ['informational', 'exploitation'],
      tags: ['security', 'threat-intel'],
    }),
  },

  // -------------------------------------------------------------------------
  // 13) OSINT Toolkit (badchars) — 37 tools across 12 sources
  // -------------------------------------------------------------------------
  {
    key: 'osint_toolkit',
    label: 'OSINT Toolkit',
    category: 'osint',
    blurb: '37 工具 OSINT 套件：DNS、WHOIS、crt.sh、GeoIP、BGP、Wayback、Hackertarget——无需 API Key。',
    whyForRedamon: '单次调用完成 DNS 侦察（解析/反查/SPF 链/DMARC/通配符/SRV）、证书透明日志检索（crt.sh）、被动 ASN/BGP 分析，补足 kali-sandbox 工具的原生缺口。',
    docsUrl: 'https://github.com/badchars/osint-mcp-server',
    authRequired: false,
    authHint: 'Optional: SHODAN_API_KEY, VT_API_KEY, ST_API_KEY, CENSYS_API_ID, CENSYS_API_SECRET unlock 14 extra tools',
    template: baseTemplate({
      id: 'osint_toolkit',
      name: 'OSINT Toolkit',
      description: 'DNS、WHOIS、crt.sh、GeoIP、BGP、Wayback（37 个工具，无需认证）',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'osint-mcp-server'],
      env: {
        // Leaving these in the form so the user can fill them when they
        // want premium tools active. Empty = those tools just don't show up.
        SHODAN_API_KEY: '',
        VT_API_KEY: '',
        ST_API_KEY: '',
      },
      default_phases: ['informational'],
      tags: ['osint', 'dns', 'recon'],
    }),
  },

  // -------------------------------------------------------------------------
  // 14) Threat Intel (AbuseIPDB + GreyNoise + AlienVault OTX + abuse.ch)
  // -------------------------------------------------------------------------
  {
    key: 'threat_intel',
    label: 'Threat Intel (AbuseIPDB + GreyNoise + OTX)',
    category: 'security',
    blurb: '统一威胁情报源：AbuseIPDB、GreyNoise、AlienVault OTX、abuse.ch。',
    whyForRedamon: 'IP 信誉增强：区分扫网流量与定向攻击、验证外带目的地、检查 WAF 黑名单；多源情报交叉验证。',
    docsUrl: 'https://github.com/aplaceforallmystuff/mcp-threatintel',
    authRequired: false,
    authHint: 'Most feeds require free API keys (AbuseIPDB, GreyNoise, OTX). abuse.ch Feodo Tracker works without auth.',
    template: baseTemplate({
      id: 'threat_intel',
      name: 'Threat Intel',
      description: 'AbuseIPDB + GreyNoise + OTX + abuse.ch 统一情报源',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'mcp-threatintel-server'],
      env: {
        ABUSEIPDB_API_KEY: '',
        GREYNOISE_API_KEY: '',
        OTX_API_KEY: '',
        ABUSECH_AUTH_KEY: '',
      },
      default_phases: ['informational', 'post_exploitation'],
      tags: ['security', 'threat-intel'],
    }),
  },

  // -------------------------------------------------------------------------
  // 15) Semgrep — static code analysis for vulnerability discovery
  // -------------------------------------------------------------------------
  {
    key: 'semgrep',
    label: 'Semgrep (SAST)',
    category: 'security',
    blurb: '基于 5,000+ 安全规则的静态分析（无需认证，本地运行）。',
    whyForRedamon: '当你外带到源码或可访问目标的公开 GitHub 时：扫描 SQLi、XSS、SSRF、硬编码密钥、反序列化利用点等；支持自定义规则用于一次性模式狩猎。',
    docsUrl: 'https://github.com/semgrep/mcp',
    authRequired: false,
    authHint: 'Optional SEMGREP_APP_TOKEN unlocks Pro rules + cloud findings dashboard.',
    template: baseTemplate({
      id: 'semgrep',
      name: 'Semgrep',
      description: '安全漏洞静态分析（5000+ 规则）',
      transport: 'stdio',
      command: 'uvx',
      args: ['semgrep-mcp'],
      env: { SEMGREP_APP_TOKEN: '' },
      default_phases: ['informational', 'exploitation'],
      tags: ['security', 'sast', 'code'],
    }),
  },

  // -------------------------------------------------------------------------
  // 16) Tavily Search — web search alternative
  // -------------------------------------------------------------------------
  {
    key: 'tavily',
    label: 'Tavily Search',
    category: 'osint',
    blurb: '为 LLM 优化的 Web 搜索 + 抽取 + 爬取。',
    whyForRedamon: '当全局未配置 Tavily Key 时可作为内置 web_search 的备选；同时提供内置版本缺少的 extract/crawl。适用于范围界定：抓取目标全站内容。',
    docsUrl: 'https://docs.tavily.com/documentation/mcp',
    authRequired: true,
    authHint: 'Free tier 1k req/month at https://app.tavily.com/home',
    template: baseTemplate({
      id: 'tavily_mcp',
      name: 'Tavily Search',
      description: 'Web 搜索、抽取、爬取（为 LLM 优化）',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'tavily-mcp@latest'],
      env: { TAVILY_API_KEY: '' },
      default_phases: ['informational'],
      tags: ['osint', 'search'],
    }),
  },

  // -------------------------------------------------------------------------
  // 17) Exa Search — neural search (semantic)
  // -------------------------------------------------------------------------
  {
    key: 'exa',
    label: 'Exa Search',
    category: 'osint',
    blurb: '神经/语义 Web 搜索——按含义而非关键词检索。',
    whyForRedamon: '按描述语义查找文章（如“近期 CVE-2024 Java 反序列化 RCE”）、发现与已知漏洞利用相似的 PoC，或按语义检索厂商专属公告。',
    docsUrl: 'https://github.com/exa-labs/exa-mcp-server',
    authRequired: true,
    authHint: 'Free tier at https://dashboard.exa.ai/api-keys',
    template: baseTemplate({
      id: 'exa',
      name: 'Exa',
      description: '语义 Web 搜索 + 爬取 + 研究',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'exa-mcp-server'],
      env: { EXA_API_KEY: '' },
      default_phases: ['informational'],
      tags: ['osint', 'search'],
    }),
  },

  // -------------------------------------------------------------------------
  // 18) DuckDuckGo Search — privacy-friendly OSINT, no auth
  // -------------------------------------------------------------------------
  {
    key: 'duckduckgo',
    label: 'DuckDuckGo Search',
    category: 'osint',
    blurb: '隐私优先的 Web 搜索（无需 API Key，不做 IP 指纹）。',
    whyForRedamon: '隐匿模式 OSINT 搜索，不与项目的 Tavily/Brave Key 关联。适用于对归因敏感、希望与自身基础设施零关联的侦察场景。',
    docsUrl: 'https://github.com/nickclyde/duckduckgo-mcp-server',
    authRequired: false,
    template: baseTemplate({
      id: 'duckduckgo',
      name: 'DuckDuckGo',
      description: '通过 DuckDuckGo 的隐私友好 Web 搜索',
      transport: 'stdio',
      command: 'uvx',
      args: ['duckduckgo-mcp-server'],
      default_phases: ['informational'],
      tags: ['osint', 'search', 'stealth'],
    }),
  },

  // -------------------------------------------------------------------------
  // 19) PostgreSQL — DB schema/query for SQLi-confirmed targets
  // -------------------------------------------------------------------------
  {
    key: 'postgres',
    label: 'PostgreSQL',
    category: 'security',
    blurb: '通过连接串执行只读 PostgreSQL 查询。',
    whyForRedamon: '当 SQLi 已获得数据库访问后，可直接使用捕获到的 DSN 结构化枚举 schema/table/user/权限——比在注入点拼 SQL 更干净。',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
    authRequired: true,
    authHint: 'Replace the placeholder URL in args with your captured/local connection string',
    template: baseTemplate({
      id: 'postgres',
      name: 'PostgreSQL',
      description: '只读数据库结构与查询检查',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://USER:PASS@HOST:5432/DBNAME'],
      default_phases: ['exploitation', 'post_exploitation'],
      tags: ['security', 'database'],
    }),
  },

  // -------------------------------------------------------------------------
  // 20) Puppeteer — browser automation (alt to system Playwright)
  // -------------------------------------------------------------------------
  {
    key: 'puppeteer',
    label: 'Puppeteer',
    category: 'web',
    blurb: '无头 Chromium 自动化——适用于 JS 渲染站点、截图等。',
    whyForRedamon: '独立浏览器通道：在系统 execute_playwright 处理主会话时，用 Puppeteer 并行执行另一条利用链。适用于需要两个浏览器上下文的 SAML/OAuth 流程。',
    docsUrl: 'https://github.com/modelcontextprotocol/servers-archived/tree/main/src/puppeteer',
    authRequired: false,
    template: baseTemplate({
      id: 'puppeteer',
      name: 'Puppeteer',
      description: '无头 Chromium 浏览器自动化',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer'],
      default_phases: ['informational', 'exploitation'],
      tags: ['web', 'browser'],
    }),
  },

  // -------------------------------------------------------------------------
  // 21) Slack — exfil findings / notify on milestones
  // -------------------------------------------------------------------------
  {
    key: 'slack',
    label: 'Slack',
    category: 'utility',
    blurb: '发送消息并读取频道历史。',
    whyForRedamon: '当智能体确认漏洞、完成阶段或需要人工审批时通知团队 Slack；也可作为长时间无人值守扫描的低噪输出通道。',
    docsUrl: 'https://github.com/modelcontextprotocol/servers-archived/tree/main/src/slack',
    authRequired: true,
    authHint: 'SLACK_BOT_TOKEN (xoxb-...) + SLACK_TEAM_ID. Create a Slack app at https://api.slack.com/apps',
    template: baseTemplate({
      id: 'slack',
      name: 'Slack',
      description: '发送消息、读取频道',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-slack'],
      env: { SLACK_BOT_TOKEN: '', SLACK_TEAM_ID: '' },
      default_phases: [...ALL_PHASES],
      tags: ['utility', 'notifications'],
    }),
  },

  // -------------------------------------------------------------------------
  // 22) Wikipedia — neutral context source
  // -------------------------------------------------------------------------
  {
    key: 'wikipedia',
    label: 'Wikipedia',
    category: 'research',
    blurb: '从 Wikipedia 搜索文章并获取内容。',
    whyForRedamon: '用于了解目标组织背景、厂商历史、邮件枚举对象的公开信息；中立来源，不受搜索 API 限速影响。',
    docsUrl: 'https://github.com/Rudra-ravi/wikipedia-mcp',
    authRequired: false,
    template: baseTemplate({
      id: 'wikipedia',
      name: 'Wikipedia',
      description: '文章搜索与内容获取',
      transport: 'stdio',
      command: 'uvx',
      args: ['wikipedia-mcp'],
      default_phases: ['informational'],
      tags: ['research', 'osint'],
    }),
  },

  // -------------------------------------------------------------------------
  // 23) OWASP ZAP — local web app scanner via MCP integration add-on
  // -------------------------------------------------------------------------
  {
    key: 'owasp_zap',
    label: 'OWASP ZAP',
    category: 'security',
    blurb: '通过 OWASP ZAP 执行爬虫、主动扫描与告警分析。',
    whyForRedamon: '由智能体驱动 ZAP 主动扫描：自动化执行 XSS/SQLi/SSRF/路径穿越等测试，载荷变体覆盖 nuclei 模板未覆盖的情况。',
    docsUrl: 'https://www.zaproxy.org/blog/2026-04-02-zap-mcp-server/',
    authRequired: true,
    authHint: 'Run ZAP locally → Marketplace → install "MCP Integration" add-on → copy the security key from Options → MCP Integration. Adjust the URL if you bind to a non-default port.',
    template: baseTemplate({
      id: 'owasp_zap',
      name: 'OWASP ZAP',
      description: 'Web 应用扫描：爬虫、主动扫描、告警',
      transport: 'streamable_http',
      url: 'http://host.docker.internal:8282/mcp',
      auth: { type: 'bearer', token: '' },
      default_phases: ['exploitation'],
      tags: ['security', 'web', 'scanner'],
    }),
  },

  // -------------------------------------------------------------------------
  // 24) AWS — cloud asset enumeration / pentest
  // -------------------------------------------------------------------------
  {
    key: 'aws',
    label: 'AWS (cloud pentest)',
    category: 'security',
    blurb: 'AWS API 访问：使用只读凭据枚举 S3、DynamoDB、IAM。',
    whyForRedamon: '当获得泄露的 AWS 凭据（例如通过 execute_gau 找到 env 文件、GitHub 外带）时，可枚举 S3/IAM/DynamoDB 并识别提权路径。',
    docsUrl: 'https://github.com/rishikavikondala/mcp-server-aws',
    authRequired: true,
    authHint: 'Provide read-only IAM credentials. Use a dedicated audit user, never your daily-driver creds.',
    template: baseTemplate({
      id: 'aws',
      name: 'AWS',
      description: 'AWS 资源枚举（S3、DynamoDB、IAM）',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'mcp-server-aws'],
      env: {
        AWS_ACCESS_KEY_ID: '',
        AWS_SECRET_ACCESS_KEY: '',
        AWS_REGION: 'us-east-1',
      },
      default_phases: ['post_exploitation'],
      tags: ['security', 'cloud'],
    }),
  },

  // -------------------------------------------------------------------------
  // 25) Censys Platform — internet asset map (hosted streamable_http)
  // -------------------------------------------------------------------------
  {
    key: 'censys',
    label: 'Censys Platform',
    category: 'security',
    blurb: '通过 Censys Search API 获取全网资产 / 证书 / 服务情报。',
    whyForRedamon: '用于与 Shodan 数据交叉验证；Censys 常能覆盖 Shodan 漏掉的资产。TLS/证书情报更强，可通过 SAN 列表挖掘影子 IT 子域。',
    docsUrl: 'https://docs.censys.com/docs/platform-mcp-server',
    authRequired: true,
    authHint: 'Personal Access Token + Organization ID from https://platform.censys.io. Free tier available.',
    template: baseTemplate({
      id: 'censys',
      name: 'Censys Platform',
      description: '全网资产、证书与服务情报',
      transport: 'streamable_http',
      url: 'https://mcp.platform.censys.io/platform/mcp/',
      auth: { type: 'bearer', token: '' },
      headers: { 'X-Organization-ID': '' },
      default_phases: ['informational'],
      tags: ['security', 'osint', 'recon'],
    }),
  },

  // -------------------------------------------------------------------------
  // 26) Hunter.io — email enumeration / domain → people
  // -------------------------------------------------------------------------
  {
    key: 'hunter',
    label: 'Hunter.io',
    category: 'osint',
    blurb: '域名 → 邮箱模式、邮箱查找与验证（托管 MCP）。',
    whyForRedamon: '用于钓鱼演练准备、社会工程目标枚举、AD 用户名模式发现（常见 email == username）。免费额度：每月 25 次请求。',
    docsUrl: 'https://hunter.io/api-documentation/v2',
    authRequired: true,
    authHint: 'Free key at https://hunter.io/api-keys (25 requests/month free tier).',
    template: baseTemplate({
      id: 'hunter',
      name: 'Hunter.io',
      description: '邮箱枚举、查找与验证',
      transport: 'streamable_http',
      url: 'https://mcp.hunter.io/mcp',
      auth: { type: 'bearer', token: '' },
      default_phases: ['informational'],
      tags: ['osint', 'email', 'social-eng'],
    }),
  },

  // -------------------------------------------------------------------------
  // 27) HaveIBeenPwned (HIBP) — credential breach intel
  // -------------------------------------------------------------------------
  {
    key: 'hibp',
    label: 'HaveIBeenPwned',
    category: 'security',
    blurb: '通过 HIBP API 查询凭据 / 密码 / 域名泄露。',
    whyForRedamon: '检查侦察收集到的邮箱是否出现在已知泄露库中，从而推测可用于撞库的密码；域名级查询可揭示整个目标的泄露暴露面。',
    docsUrl: 'https://www.npmjs.com/package/@darrenjrobinson/hibp-mcp',
    authRequired: true,
    authHint: 'HIBP API key from https://haveibeenpwned.com/API/Key ($3.50/month minimum — required for breach lookups).',
    template: baseTemplate({
      id: 'hibp',
      name: 'HaveIBeenPwned',
      description: '凭据 / 域名 / 密码泄露情报',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@darrenjrobinson/hibp-mcp'],
      env: { HIBP_API_KEY: '' },
      default_phases: ['informational', 'exploitation'],
      tags: ['security', 'creds', 'breach'],
    }),
  },

  // -------------------------------------------------------------------------
  // 28) mitmproxy — HTTP/S interception, replay, fuzzing
  // -------------------------------------------------------------------------
  {
    key: 'mitmproxy',
    label: 'mitmproxy',
    category: 'security',
    blurb: '通过 mitmproxy 检查 / 修改 / 重放 HTTP(S) 流量。',
    whyForRedamon: '进行 curl 之外的主动 Web 测试：捕获移动端/SPA 流量、中途篡改 JWT、重放会话固定载荷等；可补充 execute_playwright。',
    docsUrl: 'https://pypi.org/project/mitmproxy-mcp/',
    authRequired: false,
    template: baseTemplate({
      id: 'mitmproxy',
      name: 'mitmproxy',
      description: '检查 / 修改 / 重放 HTTP(S) 流量',
      transport: 'stdio',
      command: 'uvx',
      args: ['mitmproxy-mcp'],
      default_phases: ['exploitation'],
      tags: ['security', 'web', 'mitm'],
    }),
  },

  // -------------------------------------------------------------------------
  // 29) SQLite — local SQL queries against exfiltrated DBs
  // -------------------------------------------------------------------------
  {
    key: 'sqlite',
    label: 'SQLite',
    category: 'security',
    blurb: '通过 SQL 查询读取 SQLite 数据库。',
    whyForRedamon: '分析外带的 SQLite 文件（移动端 DB、Chrome Cookie/历史、Slack 桌面、Signal、密码管理器等）。许多高价值工件以 .db 形式存在。',
    docsUrl: 'https://github.com/modelcontextprotocol/servers-archived/tree/main/src/sqlite',
    authRequired: true,
    authHint: 'Adjust the --db-path argument to point at the SQLite file you want to query.',
    template: baseTemplate({
      id: 'sqlite',
      name: 'SQLite',
      description: '通过 SQL 读取 SQLite 数据库',
      transport: 'stdio',
      command: 'uvx',
      args: ['mcp-server-sqlite', '--db-path', '/app/logs/sandbox/target.db'],
      default_phases: ['exploitation', 'post_exploitation'],
      tags: ['security', 'database', 'forensics'],
    }),
  },

  // -------------------------------------------------------------------------
  // 30) Notion — engagement notes / report drafts
  // -------------------------------------------------------------------------
  {
    key: 'notion',
    label: 'Notion',
    category: 'utility',
    blurb: '读取 / 写入 Notion 页面与数据库。',
    whyForRedamon: '在智能体确认漏洞的同时，将发现流式写入结构化项目空间；页面可直接成为最终渗透报告的草稿章节（共 22 个工具）。',
    docsUrl: 'https://github.com/makenotion/notion-mcp-server',
    authRequired: true,
    authHint: 'Create an internal integration at https://www.notion.so/my-integrations and copy the Internal Integration Token. Share target pages with the integration.',
    template: baseTemplate({
      id: 'notion',
      name: 'Notion',
      description: 'Notion 页面 / 数据库读写（22 工具）',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@notionhq/notion-mcp-server'],
      env: { NOTION_TOKEN: '' },
      default_phases: [...ALL_PHASES],
      tags: ['utility', 'reporting'],
    }),
  },

  // -------------------------------------------------------------------------
  // 31) Browserbase — cloud headless browser, anti-detection
  // -------------------------------------------------------------------------
  {
    key: 'browserbase',
    label: 'Browserbase',
    category: 'web',
    blurb: '带隐匿与住宅代理的云无头浏览器。',
    whyForRedamon: '当本地 Playwright/Puppeteer 遭遇强风控（Cloudflare Turnstile、PerimeterX、Akamai）时，Browserbase 可提供带住宅 IP 与反检测配置的云浏览器会话。',
    docsUrl: 'https://github.com/browserbase/mcp-server-browserbase',
    authRequired: true,
    authHint: 'Sign up at https://browserbase.com — has a free tier. Need API key + project ID.',
    template: baseTemplate({
      id: 'browserbase',
      name: 'Browserbase',
      description: '带反检测的云无头浏览器',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@browserbasehq/mcp'],
      env: {
        BROWSERBASE_API_KEY: '',
        BROWSERBASE_PROJECT_ID: '',
      },
      default_phases: ['informational', 'exploitation'],
      tags: ['web', 'browser', 'stealth'],
    }),
  },

  // -------------------------------------------------------------------------
  // 32) Kubernetes — k8s pentest with kubeconfig access
  // -------------------------------------------------------------------------
  {
    key: 'kubernetes',
    label: 'Kubernetes',
    category: 'security',
    blurb: '使用 kubectl 访问 Kubernetes 集群。',
    whyForRedamon: '当目标使用 Kubernetes 且你获得 kubeconfig（泄露、RBAC 错配、特权 Pod 逃逸）时，可枚举命名空间、Secret、ServiceAccount，并寻找提权路径。',
    docsUrl: 'https://github.com/containers/kubernetes-mcp-server',
    authRequired: true,
    authHint: 'Place captured kubeconfig at $HOME/.kube/config inside the agent container, or set KUBECONFIG env var to a custom path.',
    template: baseTemplate({
      id: 'kubernetes',
      name: 'Kubernetes',
      description: 'Kubernetes 集群的 kubectl 访问',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'kubectl-mcp-server'],
      env: { KUBECONFIG: '' },
      default_phases: ['post_exploitation'],
      tags: ['security', 'cloud', 'k8s'],
    }),
  },

  // -------------------------------------------------------------------------
  // 33) Snyk — open-source dependency vulnerability scanning
  // -------------------------------------------------------------------------
  {
    key: 'snyk',
    label: 'Snyk',
    category: 'security',
    blurb: '通过 Snyk CLI 扫描开源依赖与 SAST。',
    whyForRedamon: '扫描你已外带或可访问的目标源码与依赖（package.json、requirements.txt 等），发现已知 CVE 与许可证风险。',
    docsUrl: 'https://docs.snyk.io/cli-ide-and-ci-cd-integrations/snyk-cli/developer-guardrails-for-agentic-workflows/snyk-mcp-early-access',
    authRequired: true,
    authHint: 'Free Snyk account at https://app.snyk.io. Get token via `snyk auth`. Free tier covers open-source scans.',
    template: baseTemplate({
      id: 'snyk',
      name: 'Snyk',
      description: '开源依赖 + SAST 扫描',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'snyk@latest', 'mcp', '-t', 'stdio'],
      env: { SNYK_TOKEN: '' },
      default_phases: ['informational', 'exploitation'],
      tags: ['security', 'sast'],
    }),
  },

  // -------------------------------------------------------------------------
  // 34) Stripe — payment / fraud testing
  // -------------------------------------------------------------------------
  {
    key: 'stripe',
    label: 'Stripe',
    category: 'security',
    blurb: 'Stripe API 访问（风控/测卡场景请使用测试密钥）。',
    whyForRedamon: '当渗透测试使用 Stripe 的电商目标时，可验证商户测试模式流程、模拟欺诈卡模式，并用安全的测试密钥检查 webhook 签名校验。',
    docsUrl: 'https://www.npmjs.com/package/@stripe/mcp',
    authRequired: true,
    authHint: 'Use a Stripe TEST-MODE restricted key (sk_test_...) only. Never use live keys for pentest scenarios.',
    template: baseTemplate({
      id: 'stripe',
      name: 'Stripe',
      description: 'Stripe API（使用测试密钥进行风控测试）',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@stripe/mcp', '--tools=all'],
      env: { STRIPE_API_KEY: '' },
      default_phases: ['exploitation'],
      tags: ['security', 'payments'],
    }),
  },

  // -------------------------------------------------------------------------
  // 35) Linear — issue tracking, milestone reporting
  // -------------------------------------------------------------------------
  {
    key: 'linear',
    label: 'Linear',
    category: 'utility',
    blurb: 'Linear API：创建 / 读取 / 更新 issue，用于渗透项目跟踪。',
    whyForRedamon: '将每个已确认漏洞自动转为 Linear issue（严重性、复现步骤、证据），在长周期项目中与客户修复团队同步进展。',
    docsUrl: 'https://linear.app/docs/mcp',
    authRequired: true,
    authHint: 'Personal API key from https://linear.app/settings/api (use Authorization: Bearer <key> directly — supported by Linear MCP).',
    template: baseTemplate({
      id: 'linear',
      name: 'Linear',
      description: 'Linear 工单追踪',
      transport: 'streamable_http',
      url: 'https://mcp.linear.app/mcp',
      auth: { type: 'bearer', token: '' },
      default_phases: [...ALL_PHASES],
      tags: ['utility', 'reporting'],
    }),
  },

  // -------------------------------------------------------------------------
  // 36) Trivy — container image / IaC vuln scanner
  // -------------------------------------------------------------------------
  {
    key: 'trivy',
    label: 'Trivy',
    category: 'security',
    blurb: '容器、IaC、密钥、OS 包漏洞扫描器。',
    whyForRedamon: '外带到目标 Docker 镜像 / Kubernetes 清单 / Terraform 后进行扫描：识别易受攻击的基础镜像、硬编码密钥、IaC 错配（开放安全组、公开 S3 等）。',
    docsUrl: 'https://github.com/aquasecurity/trivy-mcp',
    authRequired: false,
    authHint: 'Requires Trivy CLI installed in the agent container: docker compose exec agent apt-get install -y trivy (or: curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh).',
    template: baseTemplate({
      id: 'trivy',
      name: 'Trivy',
      description: '漏洞扫描：容器 / IaC / 密钥 / OS 包',
      transport: 'stdio',
      command: 'trivy',
      args: ['mcp'],
      default_phases: ['informational', 'exploitation'],
      tags: ['security', 'cloud', 'iac'],
    }),
  },

  // -------------------------------------------------------------------------
  // 37) Prowler (via Ship CLI) — AWS / Azure / GCP audit
  // -------------------------------------------------------------------------
  {
    key: 'prowler',
    label: 'Prowler',
    category: 'security',
    blurb: '通过 Prowler 进行多云（AWS/Azure/GCP）安全审计。',
    whyForRedamon: '当获得云凭据后，可对目标租户运行 300+ 检查：IAM 错配、公开 S3、弱 RDS 加密、开放 NSG 等，覆盖基础 AWS MCP 未覆盖的项。',
    docsUrl: 'https://github.com/cloudshipai/ship',
    authRequired: true,
    authHint: 'Install Ship CLI in the agent container: pip install cloudship-ship (then `ship mcp prowler`). Provide AWS creds via env (read-only).',
    template: baseTemplate({
      id: 'prowler',
      name: 'Prowler',
      description: '多云（AWS/Azure/GCP）安全审计',
      transport: 'stdio',
      command: 'ship',
      args: ['mcp', 'prowler'],
      env: {
        AWS_ACCESS_KEY_ID: '',
        AWS_SECRET_ACCESS_KEY: '',
        AWS_REGION: 'us-east-1',
      },
      default_phases: ['post_exploitation'],
      tags: ['security', 'cloud', 'audit'],
    }),
  },

  // -------------------------------------------------------------------------
  // 38) CVE Intel (mukul975) — NVD / EPSS / CISA KEV / MITRE ATT&CK
  // -------------------------------------------------------------------------
  {
    key: 'cve_intel_extra',
    label: 'CVE Intel (NVD+EPSS+KEV+ATT&CK)',
    category: 'security',
    blurb: '覆盖 21 个 API 的 27 个漏洞情报工具：NVD、EPSS、CISA KEV、MITRE ATT&CK。',
    whyForRedamon: '提供比内置 cve_intel 更深的 CVE 上下文：EPSS 利用概率、CISA 已知被利用状态、ATT&CK 技术映射、OSV 交叉引用，便于优先级排序与选定利用目标。',
    docsUrl: 'https://github.com/mukul975/cve-mcp-server',
    authRequired: false,
    authHint: 'REQUIRES SETUP: docker compose exec agent bash -c "git clone https://github.com/mukul975/cve-mcp-server /tmp/cve-mcp-server && cd /tmp/cve-mcp-server && pip install -e ." — then save and Test. Optional NVD_API_KEY, GITHUB_TOKEN unlock more tools.',
    template: baseTemplate({
      id: 'cve_intel_extra',
      name: 'CVE Intel (extended)',
      description: 'NVD + EPSS + CISA KEV + MITRE ATT&CK 查询',
      transport: 'stdio',
      command: 'python',
      args: ['-m', 'cve_mcp_server'],
      cwd: '/tmp/cve-mcp-server',
      env: { NVD_API_KEY: '', GITHUB_TOKEN: '' },
      default_phases: ['informational', 'exploitation'],
      tags: ['security', 'vuln-intel'],
    }),
  },

  // -------------------------------------------------------------------------
  // 39) GhidraMCP — reverse engineering / binary analysis
  // -------------------------------------------------------------------------
  {
    key: 'ghidra',
    label: 'GhidraMCP',
    category: 'security',
    blurb: '驱动 Ghidra（NSA 逆向工程框架）进行二进制分析。',
    whyForRedamon: '当你外带到专有二进制（Linux ELF、Windows PE、移动端原生库）时，可让 LLM 进行反汇编/反编译、字符串与交叉引用检索，以定位鉴权绕过、硬编码密钥与漏洞点。',
    docsUrl: 'https://github.com/LaurieWired/GhidraMCP',
    authRequired: true,
    authHint: 'REQUIRES SETUP: install Ghidra in the agent container, install the GhidraMCP plugin, then point the bridge script at your Ghidra project. See repo README for full instructions.',
    template: baseTemplate({
      id: 'ghidra',
      name: 'GhidraMCP',
      description: 'Ghidra 驱动的逆向工程',
      transport: 'stdio',
      command: 'python',
      args: ['/opt/GhidraMCP/bridge_mcp_ghidra.py'],
      default_phases: ['exploitation', 'post_exploitation'],
      tags: ['security', 'reverse-engineering'],
    }),
  },
]

export const PRESET_CATEGORY_LABELS: Record<PresetCategory, string> = {
  osint: 'OSINT',
  research: 'Research',
  web: 'Web / HTTP',
  security: 'Security',
  utility: 'Utility',
}
