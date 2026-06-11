import type { ReconPreset } from '../types'

export const DIRECTORY_DISCOVERY: ReconPreset = {
  id: 'directory-discovery',
  name: '目录与内容发现',
  icon: '',
  image: '/preset-folder-search.svg',
  shortDescription: '尽可能发现隐藏内容。ffuf 深度递归、Kiterunner API 路由、Katana/Hakrawler 深爬、GAU 历史 URL；不做漏洞扫描与 OSINT。',
  fullDescription: `### 流程目标
找出目标上的每个隐藏目录、文件、API 路由和内容片段。该预设组合了激进目录爆破（ffuf 递归深度 3，覆盖大量备份/配置扩展名）、Kiterunner API 路由爆破、Katana 与 Hakrawler 深度爬取、GAU 历史 URL 挖掘，以及 jsluice 的 JavaScript 端点提取。目标是建立内容清单，而不是做漏洞检测。

### 适用人群
适合处于早期侦察阶段、希望先完整画出目标内容版图再进入利用阶段的渗透测试人员与漏洞赏金猎人，也适合检查遗留文件、备份归档、暴露配置与未文档化 API 的安全团队。

### 启用内容
- 全量子域发现（全部工具，默认上限）
- httpx 核心探针，用于识别在线主机
- ffuf 递归深度 3、60 线程，并支持 .bak、.old、.config、.env、.sql、.zip、.tar.gz 等 13 类扩展
- Kiterunner 使用 routes-large，并对 POST/PUT/DELETE/PATCH 做方法检测
- Katana 深度 4，启用 JS 爬取，最多 2000 URL
- Hakrawler 深度 4，补充 DOM 感知爬取，最多 1000 URL
- GAU 使用全部 4 个提供方，最多 5000 URL
- jsluice 从 JavaScript 提取端点与密钥

### 禁用内容
- 端口扫描（Naabu、Masscan、Nmap）：内容发现面向已知 HTTP 端点
- Nuclei、CVE 查询、MITRE：该预设不做漏洞扫描
- ParamSpider、Arjun：重点不是参数发现
- JS Recon：端点提取由 jsluice 负责
- Banner 抓取、Wappalyzer：在此场景下价值有限
- 全部 OSINT 增强：与内容发现关联较低
- Security Checks：不需要 Header/Cookie/TLS 验证

### 工作方式
1. 子域发现找出目标的全部子域
2. httpx 探测所有已发现主机并做基础指纹识别
3. Katana 与 Hakrawler 使用两种不同引擎深度爬取在线 Web 应用
4. GAU 从归档数据源补充历史 URL
5. jsluice 从 JavaScript 中提取隐藏端点与密钥
6. ffuf 对目录与备份/配置/归档扩展进行递归模糊测试
7. Kiterunner 对 API 路由执行爆破与方法检测`,
  parameters: {
    // Modules: discovery + probing + resource enum, no vuln_scan or js_recon
    scanModules: ['domain_discovery', 'http_probe', 'resource_enum'],

    stealthMode: false,
    useTorForRecon: false,

    // --- Subdomain Discovery: all tools, default limits ---
    subdomainDiscoveryEnabled: true,
    crtshEnabled: true,
    crtshMaxResults: 10000,
    hackerTargetEnabled: true,
    hackerTargetMaxResults: 10000,
    knockpyReconEnabled: true,
    knockpyReconMaxResults: 10000,
    subfinderEnabled: true,
    subfinderMaxResults: 10000,
    amassEnabled: true,
    amassActive: false,
    amassBrute: false,
    amassMaxResults: 10000,
    purednsEnabled: true,
    useBruteforceForSubdomains: false,

    whoisEnabled: true,
    dnsEnabled: true,

    // --- DISABLE port scanning ---
    naabuEnabled: false,
    masscanEnabled: false,
    nmapEnabled: false,

    // --- httpx: essential probes only ---
    httpxEnabled: true,
    httpxThreads: 50,
    httpxTimeout: 15,
    httpxRetries: 2,
    httpxRateLimit: 75,
    httpxFollowRedirects: true,
    httpxProbeStatusCode: true,
    httpxProbeContentLength: true,
    httpxProbeContentType: true,
    httpxProbeTitle: true,
    httpxProbeServer: true,
    httpxProbeResponseTime: true,
    httpxProbeTechDetect: true,
    httpxProbeIp: true,
    httpxProbeWordCount: false,
    httpxProbeLineCount: false,
    httpxProbeCname: false,
    httpxProbeTlsInfo: false,
    httpxProbeTlsGrab: false,
    httpxProbeFavicon: false,
    httpxProbeJarm: false,
    httpxProbeAsn: false,
    httpxProbeCdn: false,
    httpxIncludeResponse: false,
    httpxIncludeResponseHeaders: false,

    // --- DISABLE Wappalyzer ---
    wappalyzerEnabled: false,

    // --- DISABLE banner grabbing ---
    bannerGrabEnabled: false,

    // --- VHost & SNI: hidden vhosts are hidden HTTP surfaces (same discovery class as ffuf dirs) ---
    vhostSniEnabled: true,
    vhostSniTestL7: true,
    vhostSniTestL4: true,
    vhostSniUseDefaultWordlist: true,
    vhostSniUseGraphCandidates: true,
    vhostSniInjectDiscovered: true,

    // --- Katana: deep crawl ---
    katanaEnabled: true,
    katanaDepth: 4,
    katanaMaxUrls: 2000,
    katanaRateLimit: 75,
    katanaTimeout: 5400,
    katanaJsCrawl: true,

    // --- Hakrawler: deep complementary crawl ---
    hakrawlerEnabled: true,
    zapAjaxSpiderEnabled: false,
    hakrawlerDepth: 4,
    hakrawlerThreads: 10,
    hakrawlerTimeout: 60,
    hakrawlerMaxUrls: 1000,
    hakrawlerIncludeSubs: true,
    hakrawlerInsecure: true,

    // --- GAU: all providers for historical URLs ---
    gauEnabled: true,
    gauProviders: ['wayback', 'commoncrawl', 'otx', 'urlscan'],
    gauMaxUrls: 5000,
    gauTimeout: 90,
    gauThreads: 5,
    gauVerifyUrls: true,
    gauDetectMethods: true,
    gauFilterDeadEndpoints: true,

    // --- DISABLE ParamSpider (not about parameters) ---
    paramspiderEnabled: false,

    // --- jsluice: endpoint and secret extraction ---
    jsluiceEnabled: true,
    jsluiceMaxFiles: 200,
    jsluiceExtractSecrets: true,
    jsluiceExtractUrls: true,
    jsluiceConcurrency: 5,

    // --- DISABLE JS Recon (jsluice is enough) ---
    jsReconEnabled: false,

    aiSurfaceReconEnabled: false,
    // --- ffuf: deep recursion + many extensions ---
    ffufEnabled: true,
    ffufThreads: 60,
    ffufRate: 0,
    ffufTimeout: 10,
    ffufMaxTime: 1200,
    ffufExtensions: ['.php', '.asp', '.aspx', '.jsp', '.html', '.js', '.bak', '.old', '.config', '.env', '.sql', '.zip', '.tar.gz'],
    ffufRecursion: true,
    ffufRecursionDepth: 3,
    ffufAutoCalibrate: true,
    ffufFollowRedirects: false,
    ffufSmartFuzz: true,

    // --- Kiterunner: API route brute-forcing ---
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

    // --- DISABLE Arjun ---
    arjunEnabled: false,

    // --- DISABLE Nuclei ---
    nucleiEnabled: false,

    // --- GraphQL: OFF -- this preset's short/full descriptions both state "no vuln
    //     scanning". GraphQL scanners (native + graphql-cop) write Vulnerability nodes
    //     and therefore count as vuln scanning. Users who want GraphQL coverage should
    //     pick graphql-recon or api-security.
    graphqlSecurityEnabled: false,
    graphqlCopEnabled: false,

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
