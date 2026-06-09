import type { ReconPreset } from '../types'

export const BUG_BOUNTY_DEEP: ReconPreset = {
  id: 'bug-bounty-deep',
  name: '漏洞赏金 - 深度挖掘',
  icon: '',
  image: '/preset-submarine.svg',
  shortDescription: '面向单目标的深入评估。深度爬取、受控的 ZAP Ajax Spider、JS 分析、全等级 Nuclei，并通过限速降低被封禁风险。',
  fullDescription: `### 流程目标
在尽量不被拦截的前提下，对单个目标做深入分析。该预设在全面性与责任限速之间做平衡：包含深度爬取、受限浏览器爬取、JS 密钥提取、全量 Nuclei 覆盖与参数发现，同时保持中等并发，尽量低于 WAF 阈值。

### 适用人群
适合已经完成初筛、准备进一步深挖的漏洞赏金猎人，也适合对特定范围执行细致 Web 应用评估的渗透测试人员。你愿意等待 1 到 2 小时，以换取更完整的结果。

### 启用内容
- 全量子域发现（全部 5 个工具，高结果上限）
- Puredns 泛解析过滤
- httpx 全探针启用，用于完整指纹识别
- Katana 深度 3，开启 JS 爬取，最多 1500 个 URL
- ZAP Ajax Spider 使用受限浏览器爬取，并以基础 URL 和端点为种子
- Hakrawler 深度 3，补充爬取覆盖
- GAU 使用全部提供方做历史端点发现
- jsluice 分析 300 个 JS 文件，提取密钥与 URL
- JS Recon 开启完整分析：Source Map、DOM Sink、依赖检查、Key 校验等
- Arjun 对 GET/POST 做参数发现
- Nuclei 启用全部严重级别、DAST 与 Interactsh OOB 检测
- Security Checks、CVE 查询与 MITRE 增强

### 禁用内容
- 端口扫描（Naabu、Masscan、Nmap）：漏洞赏金更聚焦 Web，httpx 足够处理常见 Web 端口
- ffuf 目录爆破：噪音较大，容易导致封禁
- Kiterunner API 爆破：同样噪音偏大
- ParamSpider：参数发现由 Arjun + GAU 更好覆盖
- Nuclei Headless：速度慢且占资源，收益有限
- Banner 抓取：未做端口扫描时价值不高
- 全部 OSINT 增强：通常难以直接转化为赏金有效发现

### 工作方式
1. 所有子域发现工具并行运行，并使用较高结果上限
2. httpx 对全部已发现主机执行完整技术指纹识别
3. Katana、ZAP Ajax Spider 与 Hakrawler 深度并行爬取，GAU 补充历史 URL
4. jsluice 从发现的 JS 文件中提取密钥与端点
5. JS Recon 深入分析 Source Map、DOM XSS Sink、依赖混淆与 Key 有效性
6. Arjun 在已发现端点上寻找隐藏参数
7. Nuclei 以 DAST 模式基于爬取得到的 URL 执行全模板检测并做 OOB 验证
8. Security Checks 校验 Header、TLS、Cookie 与基础设施暴露
9. CVE 查询与 MITRE 增强将结果映射到已知漏洞体系`,
  parameters: {
    // Modules: all except port_scan (web-focused) and js_recon handled via tool toggle
    scanModules: ['domain_discovery', 'http_probe', 'resource_enum', 'vuln_scan', 'js_recon'],

    // No stealth, no Tor
    stealthMode: false,
    useTorForRecon: false,

    // --- Subdomain Discovery: all tools at high limits ---
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
    amassTimeout: 15,
    purednsEnabled: true,
    useBruteforceForSubdomains: false,

    // --- WHOIS & DNS ---
    whoisEnabled: true,
    dnsEnabled: true,

    // --- DISABLE port scanning ---
    naabuEnabled: false,
    masscanEnabled: false,
    nmapEnabled: false,

    // --- httpx: all probes enabled for full fingerprinting ---
    httpxEnabled: true,
    httpxThreads: 50,
    httpxTimeout: 15,
    httpxRetries: 2,
    httpxRateLimit: 50,
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
    wappalyzerAutoUpdate: true,

    // --- DISABLE banner grabbing (no port scan) ---
    bannerGrabEnabled: false,

    // --- Katana: deep crawl, moderate rate ---
    katanaEnabled: true,
    katanaDepth: 3,
    katanaMaxUrls: 1500,
    katanaRateLimit: 50,
    katanaTimeout: 3600,
    katanaJsCrawl: true,
    katanaParallelism: 8,
    katanaConcurrency: 15,

    // --- ZAP Ajax Spider: bounded browser crawl to limit WAF pressure ---
    zapAjaxSpiderEnabled: true,
    zapAjaxSpiderSeedMode: 'base_urls_and_endpoints',
    zapAjaxSpiderMaxDuration: 10,
    zapAjaxSpiderMaxCrawlDepth: 5,
    zapAjaxSpiderMaxCrawlStates: 100,
    zapAjaxSpiderNumberOfBrowsers: 1,
    zapAjaxSpiderMaxUrls: 1000,
    zapAjaxSpiderParallelism: 3,

    // --- Hakrawler: deep crawl ---
    hakrawlerEnabled: true,
    hakrawlerDepth: 3,
    hakrawlerThreads: 5,
    hakrawlerTimeout: 45,
    hakrawlerMaxUrls: 800,
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
    gauWorkers: 10,

    // --- DISABLE ParamSpider (Arjun + GAU cover this) ---
    paramspiderEnabled: false,
    paramspiderWorkers: 8,

    // --- jsluice: moderate limits ---
    jsluiceEnabled: true,
    jsluiceMaxFiles: 300,
    jsluiceExtractSecrets: true,
    jsluiceExtractUrls: true,
    jsluiceConcurrency: 5,

    // --- JS Recon: full analysis ---
    jsReconEnabled: true,
    jsReconMaxFiles: 800,
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
    jsReconIncludeArchivedJs: true,
    jsReconMinConfidence: 'low',
    jsReconStandaloneCrawlDepth: 3,

    // --- DISABLE ffuf (too noisy, risk of IP ban) ---
    ffufEnabled: false,

    // --- DISABLE Kiterunner (too noisy) ---
    kiterunnerEnabled: false,

    // --- Arjun: GET + POST parameter discovery ---
    arjunEnabled: true,
    arjunThreads: 2,
    arjunTimeout: 15,
    arjunScanTimeout: 600,
    arjunMethods: ['GET', 'POST'],
    arjunMaxEndpoints: 50,
    arjunChunkSize: 500,
    arjunPassive: false,

    // --- Nuclei: all severities, DAST, moderate rate ---
    nucleiEnabled: true,
    nucleiSeverity: ['critical', 'high', 'medium', 'low'],
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

    // --- VHost & SNI: hidden vhost discovery is bug-bounty staple ---
    vhostSniEnabled: true,
    vhostSniTestL7: true,
    vhostSniTestL4: true,
    vhostSniUseDefaultWordlist: true,
    vhostSniUseGraphCandidates: true,
    vhostSniInjectDiscovered: true,

    // --- Subdomain Takeover: all layers on (bug bounty gold) ---
    subdomainTakeoverEnabled: true,
    subjackEnabled: true,
    subjackAll: true,
    subjackCheckNs: true,
    subjackCheckMail: true,
    nucleiTakeoversEnabled: true,
    takeoverSeverity: ['critical', 'high', 'medium', 'low'],
    takeoverConfidenceThreshold: 55,

    // --- GraphQL Security: coverage for deep hunt, but DoS probes OFF.
    //     This preset's mission ("balanced to avoid IP bans", "moderate concurrency
    //     to stay under WAF thresholds") is incompatible with graphql-cop's four
    //     DoS probes (alias overloading / array batching / directive overloading /
    //     circular introspection) which default-on and frequently trigger WAF bans.
    graphqlSecurityEnabled: true,
    graphqlCopEnabled: true,
    graphqlCopTestAliasOverloading: false,
    graphqlCopTestBatchQuery: false,
    graphqlCopTestDirectiveOverloading: false,
    graphqlCopTestCircularIntrospection: false,

    // --- CVE Lookup + MITRE: enabled ---
    cveLookupEnabled: true,
    cveLookupMaxCves: 20,
    cveLookupMinCvss: 0.0,

    mitreEnabled: true,
    mitreAutoUpdateDb: true,
    mitreIncludeCwe: true,
    mitreIncludeCapec: true,
    mitreEnrichRecon: true,

    // --- Security checks: all enabled ---
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
    securityCheckTimeout: 10,
    securityCheckMaxWorkers: 10,

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
