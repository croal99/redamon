import type { ReconPreset } from '../types'

export const GRAPHQL_RECON: ReconPreset = {
  id: 'graphql-recon',
  name: 'GraphQL 侦察',
  icon: '',
  image: '/preset-graphql.svg',
  shortDescription: '专注 GraphQL 端点。原生扫描器 + graphql-cop（12 项检查），结合 JS Recon 提取端点，并覆盖 introspection、mutation 与 DoS 探测。',
  fullDescription: `### 流程目标
找出目标暴露的每一个 GraphQL 端点，提取其 Schema，并围绕 GraphQL 特有攻击面做端到端测试：Introspection 暴露、敏感字段泄露、别名/批处理/指令/循环型 DoS、GraphiQL IDE 暴露、GET 方法 CSRF、字段建议泄露，以及错误信息暴露。该预设把 RedAmon 原生 GraphQL 扫描器与 graphql-cop 的 12 项外部检查组合使用，做交叉验证。

### 适用人群
适合以 GraphQL API 为主要目标的渗透测试人员与安全工程师，无论是独立 GraphQL 服务还是嵌入在 Web/移动端后端中的 GraphQL 接口。可用于纯 GraphQL API、REST + GraphQL 混合应用、单 GraphQL 网关 SPA，以及客户端代码中引用 GraphQL 端点的移动后端。

如果你还需要更重的 REST 端点发现能力，请使用“API 安全审计”；当 GraphQL 本身是目标时，这个预设更合适。

### 启用内容
- 被动子域发现，用于寻找 api.*、graphql.*、gql.*、v1.*、playground.* 等模式
- Naabu 扫描常见 API/GraphQL 端口，覆盖 Apollo、Hasura、graphql-yoga、Flask、Spring Boot 等部署习惯
- httpx 抓取 Content-Type 与响应内容，用于识别 application/graphql 端点
- Wappalyzer 识别 Apollo、Hasura、Relay 等框架
- Katana 深度 3 + Hakrawler，爬取前端中嵌入的 GraphQL URL
- jsluice + JS Recon，从 JS Bundle 中提取 GraphQL 端点、密钥与框架线索
- GAU + ParamSpider，用于发现历史的 /graphql、/graphiql 等路径
- Arjun 探测 query、mutation、variables、operationName 等 GraphQL 风格参数
- 原生 GraphQL 扫描器：Introspection、Schema 指纹、敏感字段、Mutation 与代理路径测试
- graphql-cop 全 12 项检查：字段建议、GraphiQL、GET CSRF、Trace/Debug、错误泄露、DoS 探测等
- Nuclei GraphQL/CSRF/Injection 标签模板
- MITRE 增强与基础传输层安全检查

### 禁用内容
- Knockpy：对标准 GraphQL 子域模式增益有限，但会多耗时
- Masscan、Nmap：Naabu 的定向端口扫描已足够
- Kiterunner 与 ffuf：GraphQL 路径通常是常见模式，不值得再做高噪音爆破
- OSINT 增强：与 GraphQL 专项测试关联较弱
- Banner 抓取：端口 Banner 不是 GraphQL 信号
- CVE 查询：框架 CVE 主要由 Nuclei 与 graphql-cop 直接发现
- URLScan、Uncover：子域发现已足够完整

### 工作方式
1. 子域发现阶段找出可能承载 GraphQL 的主机名模式
2. httpx 对每个主机做响应头与响应体探测，识别 GraphQL 特征
3. Katana 与 Hakrawler 爬取前端，发现 HTML、JS 与 Source Map 中的 URL 线索
4. JS Recon 与 jsluice 分析 JS Bundle，提取 Apollo/urql/Relay 中嵌入的 /graphql 端点
5. GAU 与 ParamSpider 从归档中拉取历史 GraphQL 路径
6. Arjun 测试 GraphQL 风格参数名
7. 原生 GraphQL 扫描器对所有候选端点做 Schema 抽取、操作枚举与敏感字段识别
8. graphql-cop 对每个端点执行 12 项外部检查，并与原生结果去重合并
9. Nuclei 用 graphql、apollo、hasura 等标签补充框架 CVE 与注入/CSRF 检测

### 预期发现（按严重性）
- Critical/High：别名过载、批量查询、指令过载、循环 Introspection DoS、敏感字段暴露
- Medium：GET 方法 CSRF、GET 变更操作、POST URL 编码 CSRF、生产环境启用 Introspection
- Low/Info：GraphiQL 暴露、字段建议开启、Trace/Debug 模式、未处理错误泄露`,
  parameters: {
    // Modules: 5 phases. port_scan included to discover non-standard API ports
    // (Apollo=4000, graphql-yoga=4000, Hasura=8080, Flask=5000, dev=3000/5013/etc.)
    scanModules: ['domain_discovery', 'port_scan', 'http_probe', 'resource_enum', 'vuln_scan'],

    stealthMode: false,
    useTorForRecon: false,

    // --- Subdomain Discovery: passive tools only (crt.sh, Subfinder, Amass passive,
    //     HackerTarget already catch api.*, graphql.*, gql.* patterns). Knockpy
    //     disabled: brute-force adds 2-5 min for marginal gain on standard names. ---
    subdomainDiscoveryEnabled: true,
    crtshEnabled: true,
    hackerTargetEnabled: true,
    knockpyReconEnabled: false,
    subfinderEnabled: true,
    amassEnabled: true,
    amassActive: false,
    amassBrute: false,
    purednsEnabled: true,
    useBruteforceForSubdomains: false,

    whoisEnabled: true,
    dnsEnabled: true,

    // --- Naabu: scoped to common API/GraphQL ports (fast, targeted) ---
    // Apollo Server, graphql-yoga, Hasura, Spring Boot, Flask-GraphQL, Strawberry,
    // Node dev, DVGA (5013), and common alt-HTTPS ports. ~50 ports, <30s per host.
    naabuEnabled: true,
    naabuScanType: 's',                  // SYN scan (fastest)
    naabuRateLimit: 500,
    naabuThreads: 25,
    naabuTimeout: 5000,
    naabuRetries: 1,
    naabuCustomPorts: '80,443,3000-3005,4000-4005,5000-5013,8000-8010,8080-8090,8443,9000-9010',
    naabuTopPorts: '',                   // Suppress top-N; use explicit list above
    naabuSkipHostDiscovery: true,
    naabuVerifyPorts: true,
    // Masscan & Nmap stay off (overkill for this scope)
    masscanEnabled: false,
    nmapEnabled: false,

    // --- httpx: aggressive tech + response capture for GraphQL detection ---
    httpxEnabled: true,
    httpxThreads: 50,
    httpxTimeout: 15,
    httpxRetries: 2,
    httpxRateLimit: 75,
    httpxFollowRedirects: true,
    httpxMaxRedirects: 10,
    httpxProbeStatusCode: true,
    httpxProbeContentLength: true,
    httpxProbeContentType: true,     // critical for detecting application/graphql
    httpxProbeTitle: true,
    httpxProbeServer: true,
    httpxProbeResponseTime: true,
    httpxProbeTechDetect: true,
    httpxProbeIp: true,
    httpxProbeCname: true,
    httpxProbeTlsInfo: true,
    httpxProbeTlsGrab: false,
    httpxProbeFavicon: false,
    httpxProbeJarm: false,
    httpxProbeAsn: false,
    httpxProbeCdn: false,
    httpxIncludeResponse: true,
    httpxIncludeResponseHeaders: true,

    // --- Wappalyzer: detects Apollo / Hasura / graphql-yoga / Relay frameworks --
    //     improves Nuclei tag targeting + decorates the graph with Technology nodes
    //     for easier Cypher querying (MATCH (t:Technology) WHERE t.name CONTAINS 'Apollo'). ---
    wappalyzerEnabled: true,
    wappalyzerMinConfidence: 50,
    // Banner grabbing stays off -- port banners aren't GraphQL signals
    bannerGrabEnabled: false,

    // --- VHost & SNI: GraphQL endpoints often live on internal vhosts (admin/internal-api/graphql) ---
    vhostSniEnabled: true,
    vhostSniTestL7: true,
    vhostSniTestL4: true,
    vhostSniUseDefaultWordlist: true,
    vhostSniUseGraphCandidates: true,
    vhostSniInjectDiscovered: true,     // newly discovered URLs feed the GraphQL endpoint discovery

    // --- Katana: deep crawl (GraphQL endpoints are often referenced deep in JS) ---
    katanaEnabled: true,
    katanaDepth: 3,
    katanaMaxUrls: 800,
    katanaRateLimit: 75,
    katanaTimeout: 2400,
    katanaJsCrawl: true,

    // --- Hakrawler: secondary crawler for corroboration ---
    hakrawlerEnabled: true,
    zapAjaxSpiderEnabled: false,
    hakrawlerDepth: 2,
    hakrawlerThreads: 10,

    // --- GAU: historical URLs (catch old /graphql paths from deploys) ---
    gauEnabled: true,
    gauThreads: 5,
    gauProviders: ['wayback', 'commoncrawl', 'otx'],
    gauVerifyUrls: true,             // Filter dead historical URLs via httpx probe
    gauDetectMethods: true,          // GraphQL is POST-heavy; method detection matters
    gauFilterDeadEndpoints: true,    // Drop 404/410/500 historical noise

    // --- ParamSpider: historical parameter patterns ---
    paramspiderEnabled: true,
    paramspiderWorkers: 5,

    // --- jsluice: extract GraphQL URLs + API secrets from JS ---
    jsluiceEnabled: true,
    jsluiceMaxFiles: 300,
    jsluiceExtractSecrets: true,
    jsluiceExtractUrls: true,
    jsluiceConcurrency: 5,

    // --- JS Recon: CRITICAL for modern GraphQL SPAs (Apollo/urql/Relay configs) ---
    jsReconEnabled: true,
    jsReconMaxFiles: 500,
    jsReconTimeout: 900,
    jsReconConcurrency: 10,
    jsReconExtractEndpoints: true,   // extracts /graphql paths from compiled JS
    jsReconRegexPatterns: true,
    jsReconSourceMaps: true,         // exposed source maps may include full schema
    jsReconDependencyCheck: true,
    jsReconDomSinks: false,          // not GraphQL-relevant
    jsReconFrameworkDetect: true,    // Apollo/Relay/urql detection
    jsReconDevComments: true,
    jsReconIncludeChunks: true,
    jsReconIncludeFrameworkJs: true,
    jsReconMinConfidence: 'low',

    // --- DISABLE Kiterunner (GraphQL paths are known patterns, not fuzzable) ---
    kiterunnerEnabled: false,

    // --- DISABLE ffuf (same reason -- our scanner already probes 12 common GraphQL paths) ---
    ffufEnabled: false,

    // --- Arjun: find endpoints accepting GraphQL-like parameters ---
    arjunEnabled: true,
    arjunThreads: 5,
    arjunTimeout: 15,
    arjunScanTimeout: 600,
    arjunMethods: ['POST', 'GET'],  // GraphQL is predominantly POST; GET for CSRF testing
    arjunMaxEndpoints: 100,
    arjunChunkSize: 500,
    arjunPassive: false,

    // --- Nuclei: GraphQL + framework-specific tags + csrf + injection
    //     (Apollo / Hasura / graphql-yoga CVEs, CSRF vectors, GraphQL injection) ---
    nucleiEnabled: true,
    nucleiSeverity: ['critical', 'high', 'medium', 'low'],
    nucleiTags: ['graphql', 'apollo', 'hasura', 'exposure', 'csrf', 'injection'],
    nucleiRateLimit: 100,
    nucleiBulkSize: 25,
    nucleiConcurrency: 25,
    nucleiTimeout: 10,
    nucleiRetries: 2,
    nucleiDastMode: true,
    nucleiAutoUpdateTemplates: true,
    nucleiFollowRedirects: true,
    nucleiMaxRedirects: 10,
    nucleiScanAllIps: false,
    nucleiInteractsh: true,

    // --- Native GraphQL Security Scanner: FULL COVERAGE ---
    graphqlSecurityEnabled: true,
    graphqlIntrospectionTest: true,
    graphqlTimeout: 45,
    graphqlRateLimit: 10,
    graphqlConcurrency: 5,
    graphqlDepthLimit: 15,
    graphqlRetryCount: 3,
    graphqlVerifySsl: true,

    // --- graphql-cop: ALL 12 CHECKS (including DoS probes) for cross-validation ---
    graphqlCopEnabled: true,
    graphqlCopTimeout: 150,
    graphqlCopForceScan: false,
    graphqlCopDebug: false,
    graphqlCopTestFieldSuggestions: true,
    graphqlCopTestIntrospection: true,       // ENABLED here for native/cop cross-validation
    graphqlCopTestGraphiql: true,
    graphqlCopTestGetMethod: true,
    graphqlCopTestGetMutation: true,
    graphqlCopTestPostCsrf: true,
    graphqlCopTestTraceMode: true,
    graphqlCopTestUnhandledError: true,
    // DoS probes: ON (this is a focused GraphQL assessment, not a general scan)
    graphqlCopTestAliasOverloading: true,
    graphqlCopTestBatchQuery: true,
    graphqlCopTestDirectiveOverloading: true,
    graphqlCopTestCircularIntrospection: true,

    // --- Security checks: minimal (transport-layer only) ---
    securityCheckEnabled: true,
    securityCheckTlsExpiringSoon: true,
    securityCheckLoginNoHttps: true,
    securityCheckSessionNoSecure: true,
    securityCheckBasicAuthNoTls: true,
    // Not GraphQL-relevant:
    securityCheckDirectIpHttp: false,
    securityCheckIpApiExposed: false,
    securityCheckWafBypass: false,

    // --- DISABLE CVE lookup (Nuclei + graphql-cop surface CVEs directly) ---
    cveLookupEnabled: false,

    // --- MITRE: ENABLE to map Nuclei-found CVEs (e.g. Apollo CVE-2023-37478) to
    //     ATT&CK techniques + CAPEC patterns. Offline DB lookup, negligible cost. ---
    mitreEnabled: true,
    mitreAutoUpdateDb: true,
    mitreIncludeCwe: true,
    mitreIncludeCapec: true,
    mitreEnrichRecon: true,

    // --- DISABLE all OSINT (not GraphQL-relevant) ---
    osintEnrichmentEnabled: false,
    shodanEnabled: false,
    urlscanEnabled: false,
    otxEnabled: false,
    censysEnabled: false,
    fofaEnabled: false,
    netlasEnabled: false,
    virusTotalEnabled: false,
    zoomEyeEnabled: false,
    criminalIpEnabled: false,
    uncoverEnabled: false,
  },
}
