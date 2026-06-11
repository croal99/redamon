import type { ReconPreset } from '../types'

export const API_SECURITY: ReconPreset = {
  id: 'api-security',
  name: 'API 安全审计',
  icon: '',
  image: '/preset-api.svg',
  shortDescription: '聚焦 REST/GraphQL API 攻击面。结合 Katana、ZAP Ajax Spider、Kiterunner、Arjun、带 API 扩展的 ffuf，以及 Nuclei API 标签模板。',
  fullDescription: `### 流程目标
梳理并测试 API 攻击面。该预设将基于爬虫的端点发现（Katana 与 ZAP Ajax Spider）、面向 API 的路由发现（Kiterunner 大型路由字典）、隐藏参数探测（Arjun 覆盖全部 HTTP 方法）、带 API 扩展名的目录模糊测试，以及针对 API 漏洞的 Nuclei 模板组合在一起。其余噪音项被尽量剔除，使扫描重点始终放在 API 本身。

### 适用人群
适合测试 REST API、GraphQL 端点或微服务架构的渗透测试人员与安全工程师。尤其适用于主要攻击面位于 API 层而非传统前端界面的应用，例如移动端后端、API 驱动型 SPA，或 Headless 服务。

### 启用内容
- 全量子域发现，用于寻找 API 子域（api.*、graphql.*、v1.* 等）
- 启用 httpx 探测、技术识别与响应抓取
- Katana 深度 2，并开启 JS 爬取，用于发现前端代码里引用的 API 端点
- ZAP Ajax Spider 使用有限制的浏览器爬取，并以基础 URL 和已知端点为种子
- Kiterunner 使用 routes-large 字典，对 API 路由进行更全面的爆破
- Arjun 对 5 种 HTTP 方法（GET/POST/PUT/DELETE/PATCH）做隐藏参数发现，最多处理 150 个端点
- ffuf 使用 API 专用扩展（.json、.xml、.graphql、.yaml、.wadl、.wsdl）并启用 smart fuzz
- jsluice 从 JavaScript 文件提取 API 端点
- Nuclei 以 DAST 模式结合 Interactsh，对 API 相关漏洞进行测试

### 禁用内容
- 端口扫描（Naabu、Masscan、Nmap）：API 测试聚焦已知 HTTP 端点
- Hakrawler：Katana 与 ZAP Ajax Spider 已覆盖爬取，Kiterunner 负责 API 路由发现
- GAU、ParamSpider：历史归档对 API 测试帮助较小
- JS Recon：不做深度 JS 分析，端点提取交由 jsluice
- Banner 抓取、Wappalyzer：对 API 定向测试价值有限
- 全部 OSINT 增强：与 API 漏洞发现关系不大
- Security Checks：请求头检查优先级低于 API 逻辑漏洞
- CVE 查询与 MITRE 增强：漏洞识别直接由 Nuclei 承担

### 工作方式
1. 子域发现阶段找出全部子域，包括 API 专用子域
2. httpx 探测已发现主机，并抓取响应体用于识别 API
3. Katana 爬取前端代码，发现其中引用的 API 端点
4. ZAP Ajax Spider 从基础 URL 与端点出发，进行受限浏览器爬取
5. Kiterunner 基于 14 万+ Swagger/OpenAPI 路由模式进行 API 路由爆破
6. ffuf 对目录与 API 专用扩展做模糊测试，寻找未文档化端点
7. Arjun 在所有发现的端点和 HTTP 方法上挖掘隐藏参数
8. jsluice 从 JavaScript 文件提取 API URL 与密钥
9. Nuclei 以 DAST 模式结合 OOB 检测执行 API 定向模板`,
  parameters: {
    // Modules: 5 phases. port_scan added to discover non-standard API ports
    // (4000=Apollo/graphql-yoga, 3000=Node dev, 8080=Spring Boot, 5000=Flask/Strawberry)
    scanModules: ['domain_discovery', 'port_scan', 'http_probe', 'resource_enum', 'vuln_scan'],

    stealthMode: false,
    useTorForRecon: false,

    // --- Subdomain Discovery: all tools ---
    subdomainDiscoveryEnabled: true,
    crtshEnabled: true,
    hackerTargetEnabled: true,
    knockpyReconEnabled: true,
    subfinderEnabled: true,
    amassEnabled: true,
    amassActive: false,
    amassBrute: false,
    purednsEnabled: true,
    useBruteforceForSubdomains: false,

    whoisEnabled: true,
    dnsEnabled: true,

    // --- Naabu: scoped to common API ports (Apollo=4000, Hasura=8080, Node=3000,
    //     Flask=5000, Spring=8080, alt-HTTPS=8443). ~50 ports, <30s per host.
    //     Without this, httpx only probes 80/443 and misses ~30-40% of real API deployments. ---
    naabuEnabled: true,
    naabuScanType: 's',
    naabuRateLimit: 500,
    naabuThreads: 25,
    naabuTimeout: 5000,
    naabuRetries: 1,
    naabuCustomPorts: '80,443,3000-3005,4000-4005,5000-5013,8000-8010,8080-8090,8443,9000-9010',
    naabuTopPorts: '',
    naabuSkipHostDiscovery: true,
    naabuVerifyPorts: true,
    // Masscan & Nmap stay off (overkill for API scope)
    masscanEnabled: false,
    nmapEnabled: false,

    // --- httpx: tech detect + response capture for API detection ---
    httpxEnabled: true,
    httpxThreads: 50,
    httpxTimeout: 15,
    httpxRetries: 2,
    httpxRateLimit: 75,
    httpxFollowRedirects: true,
    httpxMaxRedirects: 10,
    httpxProbeStatusCode: true,
    httpxProbeContentLength: true,
    httpxProbeContentType: true,
    httpxProbeTitle: true,
    httpxProbeServer: true,
    httpxProbeResponseTime: true,
    httpxProbeWordCount: false,
    httpxProbeLineCount: false,
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

    // --- DISABLE Wappalyzer ---
    wappalyzerEnabled: false,

    // --- DISABLE banner grabbing ---
    bannerGrabEnabled: false,

    // --- VHost & SNI: API gateways often hide behind reverse proxies + SNI routing ---
    vhostSniEnabled: true,
    vhostSniTestL7: true,
    vhostSniTestL4: true,
    vhostSniUseDefaultWordlist: true,
    vhostSniUseGraphCandidates: true,
    vhostSniInjectDiscovered: true,

    // --- Katana: moderate crawl for API endpoint discovery in frontend ---
    katanaEnabled: true,
    katanaDepth: 2,
    katanaMaxUrls: 500,
    katanaRateLimit: 75,
    katanaTimeout: 1800,
    katanaJsCrawl: true,

    // --- ZAP Ajax Spider: bounded browser crawl seeded from APIs/endpoints ---
    zapAjaxSpiderEnabled: true,
    zapAjaxSpiderSeedMode: 'base_urls_and_endpoints',
    zapAjaxSpiderMaxDuration: 10,
    zapAjaxSpiderMaxCrawlDepth: 5,
    zapAjaxSpiderMaxCrawlStates: 100,
    zapAjaxSpiderNumberOfBrowsers: 1,
    zapAjaxSpiderMaxUrls: 1000,
    zapAjaxSpiderParallelism: 3,

    // --- DISABLE Hakrawler (Kiterunner handles API discovery) ---
    hakrawlerEnabled: false,

    // --- DISABLE GAU & ParamSpider ---
    gauEnabled: false,
    paramspiderEnabled: false,

    // --- jsluice: extract API endpoints from JS ---
    jsluiceEnabled: true,
    jsluiceMaxFiles: 200,
    jsluiceExtractSecrets: true,
    jsluiceExtractUrls: true,
    jsluiceConcurrency: 5,

    // --- DISABLE JS Recon (jsluice covers endpoint extraction) ---
    jsReconEnabled: false,

    aiSurfaceReconEnabled: false,
    // --- ffuf: API-specific extensions, smart fuzz ---
    ffufEnabled: true,
    ffufThreads: 40,
    ffufRate: 0,
    ffufTimeout: 10,
    ffufMaxTime: 900,
    ffufExtensions: ['.json', '.xml', '.graphql', '.yaml', '.wadl', '.wsdl'],
    ffufRecursion: false,
    ffufAutoCalibrate: true,
    ffufFollowRedirects: false,
    ffufSmartFuzz: true,

    // --- Kiterunner: routes-large, high concurrency ---
    kiterunnerEnabled: true,
    kiterunnerWordlists: ['routes-large'],
    kiterunnerRateLimit: 150,
    kiterunnerConnections: 150,
    kiterunnerTimeout: 10,
    kiterunnerScanTimeout: 1200,
    kiterunnerThreads: 50,
    kiterunnerDetectMethods: true,
    kiterunnerMethodDetectionMode: 'bruteforce',
    kiterunnerBruteforceMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],

    // --- Arjun: all 5 HTTP methods, high endpoint limit ---
    arjunEnabled: true,
    arjunThreads: 5,
    arjunTimeout: 15,
    arjunScanTimeout: 900,
    arjunMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    arjunMaxEndpoints: 150,
    arjunChunkSize: 500,
    arjunPassive: false,

    // --- Nuclei: DAST + Interactsh, API-focused tags ---
    nucleiEnabled: true,
    nucleiSeverity: ['critical', 'high', 'medium', 'low'],
    nucleiTags: ['api', 'swagger', 'openapi', 'graphql', 'apollo', 'hasura', 'csrf', 'injection', 'ssrf'],
    nucleiRateLimit: 100,
    nucleiBulkSize: 25,
    nucleiConcurrency: 25,
    nucleiTimeout: 10,
    nucleiRetries: 2,
    nucleiDastMode: true,
    nucleiAutoUpdateTemplates: true,
    nucleiHeadless: false,
    nucleiSystemResolvers: true,
    nucleiFollowRedirects: true,
    nucleiMaxRedirects: 10,
    nucleiScanAllIps: false,
    nucleiInteractsh: true,

    // --- GraphQL Security Scanner: API preset is the primary target ---
    graphqlSecurityEnabled: true,
    graphqlIntrospectionTest: true,
    graphqlConcurrency: 5,
    graphqlRateLimit: 10,

    // --- graphql-cop: full 12-check coverage for API pentests ---
    graphqlCopEnabled: true,

    // --- DISABLE CVE lookup & MITRE ---
    cveLookupEnabled: false,
    mitreEnabled: false,

    // --- DISABLE security checks ---
    securityCheckEnabled: false,

    // --- DISABLE all OSINT ---
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
