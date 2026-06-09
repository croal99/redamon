import type { ReconPreset } from '../types'

export const FULL_ACTIVE_SCAN: ReconPreset = {
  id: 'full-active-scan',
  name: '全流程 - 仅主动扫描',
  icon: '',
  image: '/preset-radar.svg',
  shortDescription: '所有主动工具全开并拉满，被动来源全部关闭。最高噪音，最高覆盖。',
  fullDescription: `### 流程目标
以最大强度启用所有主动侦察工具。该预设会直接向目标发送探测流量，覆盖端口、HTTP、爬取、模糊测试、API 发现与漏洞扫描。无被动 OSINT、无归档检索，纯主动探测。

### 适用人群
适合已获得充分授权、且无需隐蔽性的渗透测试人员。可用于内网评估、实验环境，或明确授权的外网测试场景，目标是不计是否会被发现，尽快找全问题。

### 启用内容
- 全量端口扫描：Naabu SYN + Masscan + Nmap 版本识别/NSE
- 对所有非 HTTP 服务做 Banner 抓取
- httpx 启用全部探针，包括技术识别、TLS、JARM、favicon、ASN、CDN 与响应体
- Wappalyzer 技术指纹识别
- Katana 深度 4，开启 JS 爬取，最多 2000 URL
- ZAP Ajax Spider 做受限浏览器爬取
- Hakrawler 深度 4，包含子域
- ffuf 目录递归爆破
- Kiterunner API 路由发现
- Arjun 对全部 HTTP 方法做参数发现
- Nuclei 启用全部严重级别、DAST、Headless、Interactsh
- 全部 28 项安全检查
- CVE 查询与 MITRE 增强
- Amass 主动模式 + DNS 爆破
- JS Recon 深度分析 Source Map、DOM Sink、依赖与 Key

### 禁用内容
- GAU 与 ParamSpider：属于被动归档数据源
- 全部 OSINT 增强：属于被动来源
- jsReconIncludeArchivedJs：Wayback 归档 JS 属于被动来源
- Stealth Mode 与 Tor：与主动扫描目标冲突
- Naabu 被动模式：这里追求真实 SYN 扫描

### 工作方式
1. 子域发现阶段使用全部工具，并启用 Amass 主动爆破
2. Naabu 扫 Top 1000 端口，Masscan 提速，Nmap 补充版本与 NSE
3. httpx 对所有 host:port 组合做完整指纹识别
4. Banner 抓取识别非 HTTP 服务
5. Katana、ZAP Ajax Spider 与 Hakrawler 激进爬取所有在线 Web 应用
6. ffuf 爆目录，Kiterunner 发现 API 路由
7. Arjun 对发现的端点执行隐藏参数挖掘
8. Nuclei 以 DAST 模式结合 Headless 与 OOB 检测跑全模板
9. JS Recon 抓取并分析 JS 文件，提取端点、密钥、Source Map 与 DOM XSS Sink
10. CVE 查询映射服务版本到已知漏洞
11. Security Checks 验证 Header、TLS、DNS 与基础设施暴露`,
  parameters: {
    // All scan modules enabled including js_recon (actively crawls and downloads JS files)
    scanModules: ['domain_discovery', 'port_scan', 'http_probe', 'resource_enum', 'vuln_scan', 'js_recon'],

    // Stealth OFF, Tor OFF
    stealthMode: false,
    useTorForRecon: false,

    // --- Subdomain Discovery: all tools enabled, Amass in active + brute mode ---
    subdomainDiscoveryEnabled: true,
    crtshEnabled: true,
    hackerTargetEnabled: true,
    knockpyReconEnabled: true,
    subfinderEnabled: true,
    amassEnabled: true,
    amassActive: true,
    amassBrute: true,
    purednsEnabled: true,
    useBruteforceForSubdomains: true,

    // --- Port Scanning: all 3 scanners enabled ---
    naabuEnabled: true,
    naabuPassiveMode: false,
    naabuScanType: 's',
    naabuTopPorts: '1000',
    naabuRateLimit: 1000,
    naabuThreads: 25,
    naabuTimeout: 10000,
    naabuRetries: 2,
    naabuExcludeCdn: false,
    naabuDisplayCdn: true,
    naabuSkipHostDiscovery: true,
    naabuVerifyPorts: true,

    masscanEnabled: true,
    masscanTopPorts: '1000',
    masscanRate: 5000,
    masscanBanners: true,
    masscanWait: 10,
    masscanRetries: 2,

    nmapEnabled: true,
    nmapVersionDetection: true,
    nmapScriptScan: true,
    nmapTimingTemplate: 'T4',
    nmapTimeout: 900,
    nmapHostTimeout: 450,

    // --- HTTP Probing: all probes maxed ---
    httpxEnabled: true,
    httpxThreads: 50,
    httpxTimeout: 15,
    httpxRetries: 3,
    httpxRateLimit: 100,
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

    // --- Wappalyzer: enabled ---
    wappalyzerEnabled: true,
    wappalyzerMinConfidence: 30,
    wappalyzerRequireHtml: false,
    wappalyzerAutoUpdate: true,

    // --- Banner Grabbing: enabled ---
    bannerGrabEnabled: true,
    bannerGrabTimeout: 10,
    bannerGrabThreads: 30,
    bannerGrabMaxLength: 1000,

    // --- Katana: deep aggressive crawl ---
    katanaEnabled: true,
    katanaDepth: 4,
    katanaMaxUrls: 2000,
    katanaRateLimit: 100,
    katanaTimeout: 5400,
    katanaJsCrawl: true,

    // --- ZAP Ajax Spider: bounded browser crawl for active coverage ---
    zapAjaxSpiderEnabled: true,
    zapAjaxSpiderSeedMode: 'base_urls_and_endpoints',
    zapAjaxSpiderMaxDuration: 10,
    zapAjaxSpiderMaxCrawlDepth: 5,
    zapAjaxSpiderMaxCrawlStates: 100,
    zapAjaxSpiderNumberOfBrowsers: 1,
    zapAjaxSpiderMaxUrls: 1000,
    zapAjaxSpiderParallelism: 3,

    // --- Hakrawler: deep aggressive crawl ---
    hakrawlerEnabled: true,
    hakrawlerDepth: 4,
    hakrawlerThreads: 10,
    hakrawlerTimeout: 60,
    hakrawlerMaxUrls: 1000,
    hakrawlerIncludeSubs: true,
    hakrawlerInsecure: true,

    // --- ffuf: directory fuzzing with recursion ---
    ffufEnabled: true,
    ffufThreads: 50,
    ffufRate: 0,
    ffufTimeout: 10,
    ffufMaxTime: 900,
    ffufRecursion: true,
    ffufRecursionDepth: 2,
    ffufAutoCalibrate: true,
    ffufFollowRedirects: false,
    ffufSmartFuzz: true,

    // --- Kiterunner: API endpoint discovery ---
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

    // --- Arjun: parameter discovery (active, not passive) ---
    arjunEnabled: true,
    arjunThreads: 5,
    arjunTimeout: 15,
    arjunScanTimeout: 900,
    arjunMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    arjunMaxEndpoints: 100,
    arjunChunkSize: 500,
    arjunPassive: false,

    // --- jsluice: runs post-crawl on discovered JS files ---
    jsluiceEnabled: true,
    jsluiceMaxFiles: 300,
    jsluiceExtractSecrets: true,
    jsluiceExtractUrls: true,
    jsluiceConcurrency: 10,

    // --- Nuclei: full DAST + headless + OOB ---
    nucleiEnabled: true,
    nucleiSeverity: ['critical', 'high', 'medium', 'low'],
    nucleiRateLimit: 150,
    nucleiBulkSize: 50,
    nucleiConcurrency: 50,
    nucleiTimeout: 15,
    nucleiRetries: 2,
    nucleiDastMode: true,
    nucleiAutoUpdateTemplates: true,
    nucleiHeadless: true,
    nucleiSystemResolvers: true,
    nucleiFollowRedirects: true,
    nucleiMaxRedirects: 10,
    nucleiScanAllIps: true,
    nucleiInteractsh: true,

    // --- VHost & SNI: full hidden vhost discovery ---
    vhostSniEnabled: true,
    vhostSniTestL7: true,
    vhostSniTestL4: true,
    vhostSniUseDefaultWordlist: true,
    vhostSniUseGraphCandidates: true,

    // --- Subdomain Takeover: all layers on ---
    subdomainTakeoverEnabled: true,
    subjackEnabled: true,
    subjackAll: true,
    subjackCheckNs: true,
    subjackCheckAr: true,
    subjackCheckMail: true,
    nucleiTakeoversEnabled: true,
    takeoverSeverity: ['critical', 'high', 'medium', 'low'],

    // --- GraphQL Security: full active coverage ---
    graphqlSecurityEnabled: true,
    graphqlCopEnabled: true,

    // --- CVE Lookup: enabled ---
    cveLookupEnabled: true,
    cveLookupMaxCves: 30,
    cveLookupMinCvss: 0.0,

    // --- MITRE Enrichment: enabled ---
    mitreEnabled: true,
    mitreAutoUpdateDb: true,
    mitreIncludeCwe: true,
    mitreIncludeCapec: true,
    mitreEnrichRecon: true,

    // --- Security Checks: all enabled ---
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
    securityCheckTimeout: 15,
    securityCheckMaxWorkers: 15,

    // --- DISABLE all passive sources ---
    gauEnabled: false,
    paramspiderEnabled: false,
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

    // --- JS Recon: actively crawls and downloads JS files for deep analysis ---
    jsReconEnabled: true,
    jsReconMaxFiles: 1000,
    jsReconTimeout: 1800,
    jsReconConcurrency: 10,
    jsReconValidateKeys: true,
    jsReconValidationTimeout: 5,
    jsReconExtractEndpoints: true,
    jsReconRegexPatterns: true,
    jsReconSourceMaps: true,
    jsReconDependencyCheck: true,
    jsReconDomSinks: true,
    jsReconFrameworkDetect: true,
    jsReconDevComments: true,
    jsReconIncludeChunks: true,
    jsReconIncludeFrameworkJs: true,
    jsReconIncludeArchivedJs: false,
    jsReconMinConfidence: 'low',
    jsReconStandaloneCrawlDepth: 4,
  },
}
