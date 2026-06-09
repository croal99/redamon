import type { ReconPreset } from '../types'

export const FULL_MAXIMUM_SCAN: ReconPreset = {
  id: 'full-maximum-scan',
  name: '全流程 - 最大强度',
  icon: '',
  image: '/preset-bolt.svg',
  shortDescription: '所有工具全部启用，参数推到极限。耗时最长、覆盖最彻底。',
  fullDescription: `### 流程目标
启用流水线中的每一个工具，并把参数调到最大且仍有意义的水平。主动扫描、被动 OSINT、JS 分析、目录爆破、API 发现、漏洞扫描同时进行，深度、并发与结果上限全部拉满。这是“不放过任何角落”的预设。

### 适用人群
适合已获得完整授权、准备对目标做最后一次全量覆盖扫描的渗透测试人员，也适合对自有基础设施做最彻底基线盘点的安全团队。大目标通常需要数小时才能跑完。

### 启用内容
- 6 个扫描模块全部启用：domain_discovery、port_scan、http_probe、resource_enum、vuln_scan、js_recon
- 子域发现：全部工具 10000 上限，Amass 主动模式 + 爆破 + Puredns 校验
- 端口扫描：Naabu SYN + Masscan 10000 pps + Nmap T4
- httpx：全部探针 + 响应体抓取 + 高并发
- Wappalyzer：较低置信度阈值，尽量多识别技术栈
- Banner 抓取：40 线程，2KB 缓冲
- Katana：深度 5、5000 URL、JS 爬取、150/s
- Hakrawler：深度 5、2000 URL、15 线程
- GAU：全部 4 个提供方，10000 URL，带校验与方法检测
- ParamSpider、jsluice、JS Recon、ffuf、Kiterunner、Arjun 全部高强度启用
- Nuclei：全部严重级别 + DAST + Headless + Interactsh + Scan All IPs
- 全部 28 项安全检查
- CVE 查询：每个服务最多 50 条，不设 CVSS 下限
- MITRE 全量 CWE/CAPEC 增强
- 10 个 OSINT 提供方全部启用并提高结果上限

### 禁用内容
- 无。所有工具都已启用。
- Stealth Mode 关闭，因为与“最大扫描”目标冲突
- Tor 关闭，因为会显著限制吞吐

### 工作方式
1. 全部子域发现工具并行运行，同时启用 Amass 主动爆破
2. Puredns 过滤泛解析，DNS 解析所有子域
3. Naabu 与 Masscan 并行做端口发现，Nmap 补充版本与 NSE
4. httpx 对所有 host:port 组合执行完整指纹识别
5. Banner 抓取识别非 HTTP 服务
6. Katana、Hakrawler、GAU、ParamSpider 联合发现全部可达端点
7. jsluice 与 JS Recon 深入分析 JavaScript，提取端点、密钥、Source Map 与 DOM Sink
8. ffuf 递归爆目录，Kiterunner 发现 API 路由
9. Arjun 在全部发现端点上挖掘隐藏参数
10. Nuclei 以 DAST 模式结合 Headless 与 OOB 跑全模板
11. 全部 OSINT 提供方为 IP 与域名补充情报
12. CVE 查询与 MITRE 增强把所有发现映射到已知漏洞与攻击模式`,
  parameters: {
    // All 6 scan modules
    scanModules: ['domain_discovery', 'port_scan', 'http_probe', 'resource_enum', 'vuln_scan', 'js_recon'],

    // No stealth, no Tor
    stealthMode: false,
    useTorForRecon: false,

    // --- Subdomain Discovery: everything maxed ---
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
    amassActive: true,
    amassBrute: true,
    amassMaxResults: 10000,
    amassTimeout: 20,
    purednsEnabled: true,
    useBruteforceForSubdomains: true,

    // --- WHOIS & DNS ---
    whoisEnabled: true,
    dnsEnabled: true,
    dnsMaxWorkers: 100,

    // --- Port Scanning: all 3 maxed ---
    naabuEnabled: true,
    naabuPassiveMode: false,
    naabuScanType: 's',
    naabuTopPorts: '1000',
    naabuRateLimit: 1500,
    naabuThreads: 50,
    naabuTimeout: 10000,
    naabuRetries: 3,
    naabuExcludeCdn: false,
    naabuDisplayCdn: true,
    naabuSkipHostDiscovery: true,
    naabuVerifyPorts: true,

    masscanEnabled: true,
    masscanTopPorts: '1000',
    masscanRate: 10000,
    masscanBanners: true,
    masscanWait: 10,
    masscanRetries: 3,

    nmapEnabled: true,
    nmapVersionDetection: true,
    nmapScriptScan: true,
    nmapTimingTemplate: 'T4',
    nmapTimeout: 1200,
    nmapHostTimeout: 600,
    nmapParallelism: 5,

    // --- httpx: all probes maxed ---
    httpxEnabled: true,
    httpxThreads: 75,
    httpxTimeout: 20,
    httpxRetries: 3,
    httpxRateLimit: 150,
    httpxFollowRedirects: true,
    httpxMaxRedirects: 10,
    httpxProbeStatusCode: true,
    httpxProbeContentLength: true,
    httpxProbeContentType: true,
    httpxProbeTitle: true,
    httpxProbeServer: true,
    httpxProbeResponseTime: true,
    httpxProbeWordCount: true,
    httpxProbeLineCount: true,
    httpxProbeTechDetect: true,
    httpxProbeIp: true,
    httpxProbeCname: true,
    httpxProbeTlsInfo: true,
    httpxProbeTlsGrab: true,
    httpxProbeFavicon: true,
    httpxProbeJarm: true,
    httpxProbeHash: 'sha256',
    httpxProbeAsn: true,
    httpxProbeCdn: true,
    httpxIncludeResponse: true,
    httpxIncludeResponseHeaders: true,

    // --- Wappalyzer: low confidence to catch more ---
    wappalyzerEnabled: true,
    wappalyzerMinConfidence: 20,
    wappalyzerRequireHtml: false,
    wappalyzerAutoUpdate: true,

    // --- Banner Grabbing: high threads, large buffer ---
    bannerGrabEnabled: true,
    bannerGrabTimeout: 15,
    bannerGrabThreads: 40,
    bannerGrabMaxLength: 2000,

    // --- Katana: maximum crawl ---
    katanaEnabled: true,
    katanaDepth: 5,
    katanaMaxUrls: 5000,
    katanaRateLimit: 150,
    katanaTimeout: 7200,
    katanaJsCrawl: true,
    katanaParallelism: 15,
    katanaConcurrency: 25,

    // --- Hakrawler: maximum crawl ---
    hakrawlerEnabled: true,
    zapAjaxSpiderEnabled: false,
    hakrawlerDepth: 5,
    hakrawlerThreads: 15,
    hakrawlerTimeout: 90,
    hakrawlerMaxUrls: 2000,
    hakrawlerIncludeSubs: true,
    hakrawlerInsecure: true,
    hakrawlerParallelism: 8,

    // --- GAU: all providers, high limits, with verification ---
    gauEnabled: true,
    gauProviders: ['wayback', 'commoncrawl', 'otx', 'urlscan'],
    gauMaxUrls: 10000,
    gauTimeout: 120,
    gauThreads: 10,
    gauVerifyUrls: true,
    gauDetectMethods: true,
    gauFilterDeadEndpoints: true,
    gauWorkers: 15,

    // --- ParamSpider: enabled ---
    paramspiderEnabled: true,
    paramspiderTimeout: 180,
    paramspiderWorkers: 10,

    // --- jsluice: high limits ---
    jsluiceEnabled: true,
    jsluiceMaxFiles: 1000,
    jsluiceExtractSecrets: true,
    jsluiceExtractUrls: true,
    jsluiceConcurrency: 15,
    jsluiceParallelism: 5,

    // --- JS Recon: everything enabled, max files ---
    jsReconEnabled: true,
    jsReconMaxFiles: 2000,
    jsReconTimeout: 3600,
    jsReconConcurrency: 15,
    jsReconValidateKeys: true,
    jsReconValidationTimeout: 10,
    jsReconExtractEndpoints: true,
    jsReconRegexPatterns: true,
    jsReconSourceMaps: true,
    jsReconDependencyCheck: true,
    jsReconDomSinks: true,
    jsReconFrameworkDetect: true,
    jsReconDevComments: true,
    jsReconIncludeChunks: true,
    jsReconIncludeFrameworkJs: true,
    jsReconIncludeArchivedJs: true,
    jsReconMinConfidence: 'low',
    jsReconStandaloneCrawlDepth: 5,

    // --- ffuf: recursion, high threads ---
    ffufEnabled: true,
    ffufThreads: 60,
    ffufRate: 0,
    ffufTimeout: 15,
    ffufMaxTime: 1200,
    ffufRecursion: true,
    ffufRecursionDepth: 3,
    ffufAutoCalibrate: true,
    ffufFollowRedirects: false,
    ffufSmartFuzz: true,
    ffufParallelism: 5,

    // --- Kiterunner: routes-large, high connections ---
    kiterunnerEnabled: true,
    kiterunnerWordlists: ['routes-large'],
    kiterunnerRateLimit: 200,
    kiterunnerConnections: 200,
    kiterunnerTimeout: 15,
    kiterunnerScanTimeout: 1800,
    kiterunnerThreads: 75,
    kiterunnerDetectMethods: true,
    kiterunnerMethodDetectionMode: 'bruteforce',
    kiterunnerBruteforceMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
    kiterunnerParallelism: 3,

    // --- Arjun: all methods, high limits ---
    arjunEnabled: true,
    arjunThreads: 10,
    arjunTimeout: 20,
    arjunScanTimeout: 1200,
    arjunMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    arjunMaxEndpoints: 200,
    arjunChunkSize: 1000,
    arjunPassive: false,

    // --- VHost & SNI: everything maxed ---
    vhostSniEnabled: true,
    vhostSniTestL7: true,
    vhostSniTestL4: true,
    vhostSniUseDefaultWordlist: true,
    vhostSniUseGraphCandidates: true,
    vhostSniInjectDiscovered: true,
    vhostSniConcurrency: 40,
    vhostSniMaxCandidatesPerIp: 5000,

    // --- Nuclei: everything maxed ---
    nucleiEnabled: true,
    nucleiSeverity: ['critical', 'high', 'medium', 'low'],
    nucleiRateLimit: 200,
    nucleiBulkSize: 75,
    nucleiConcurrency: 75,
    nucleiTimeout: 20,
    nucleiRetries: 3,
    nucleiDastMode: true,
    nucleiAutoUpdateTemplates: true,
    nucleiHeadless: true,
    nucleiSystemResolvers: true,
    nucleiFollowRedirects: true,
    nucleiMaxRedirects: 10,
    nucleiScanAllIps: true,
    nucleiInteractsh: true,

    // --- GraphQL Security: max coverage ---
    graphqlSecurityEnabled: true,
    graphqlCopEnabled: true,
    graphqlCopTestIntrospection: true,  // Both scanners for cross-validation

    // --- CVE Lookup: max ---
    cveLookupEnabled: true,
    cveLookupMaxCves: 50,
    cveLookupMinCvss: 0.0,

    // --- MITRE: full enrichment ---
    mitreEnabled: true,
    mitreAutoUpdateDb: true,
    mitreIncludeCwe: true,
    mitreIncludeCapec: true,
    mitreEnrichRecon: true,

    // --- All 28 security checks ---
    securityCheckEnabled: true,
    securityCheckDirectIpHttp: true,
    securityCheckDirectIpHttps: true,
    securityCheckIpApiExposed: true,
    securityCheckWafBypass: true,
    securityCheckTlsExpiringSoon: true,
    securityCheckTlsExpiryDays: 30,
    securityCheckMissingReferrerPolicy: true,
    securityCheckMissingPermissionsPolicy: true,
    securityCheckMissingCoop: true,
    securityCheckMissingCorp: true,
    securityCheckMissingCoep: true,
    securityCheckCacheControlMissing: true,
    securityCheckLoginNoHttps: true,
    securityCheckSessionNoSecure: true,
    securityCheckSessionNoHttponly: true,
    securityCheckBasicAuthNoTls: true,
    securityCheckSpfMissing: true,
    securityCheckDmarcMissing: true,
    securityCheckDnssecMissing: true,
    securityCheckZoneTransfer: true,
    securityCheckAdminPortExposed: true,
    securityCheckDatabaseExposed: true,
    securityCheckRedisNoAuth: true,
    securityCheckKubernetesApiExposed: true,
    securityCheckSmtpOpenRelay: true,
    securityCheckCspUnsafeInline: true,
    securityCheckInsecureFormAction: true,
    securityCheckNoRateLimiting: true,
    securityCheckTimeout: 20,
    securityCheckMaxWorkers: 20,

    // --- All 10 OSINT providers at maximum ---
    osintEnrichmentEnabled: true,

    shodanEnabled: true,
    shodanHostLookup: true,
    shodanReverseDns: true,
    shodanDomainDns: true,
    shodanPassiveCves: true,
    shodanWorkers: 10,

    urlscanEnabled: true,
    urlscanMaxResults: 10000,

    otxEnabled: true,
    otxWorkers: 10,

    censysEnabled: true,
    censysWorkers: 10,

    fofaEnabled: true,
    fofaMaxResults: 5000,
    fofaWorkers: 10,

    netlasEnabled: true,
    netlasWorkers: 10,

    virusTotalEnabled: true,
    virusTotalWorkers: 4,

    zoomEyeEnabled: true,
    zoomEyeMaxResults: 5000,
    zoomEyeWorkers: 10,

    criminalIpEnabled: true,
    criminalIpWorkers: 10,

    uncoverEnabled: true,
    uncoverMaxResults: 1000,
  },
}
