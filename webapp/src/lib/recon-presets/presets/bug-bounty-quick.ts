import type { ReconPreset } from '../types'

export const BUG_BOUNTY_QUICK: ReconPreset = {
  id: 'bug-bounty-quick',
  name: '漏洞赏金 - 快速收益',
  icon: '',
  image: '/preset-bug.svg',
  shortDescription: '轻量快速扫描低垂果实。15 分钟内给出可操作结果。',
  fullDescription: `### 流程目标
速度优先于深度。快速发现子域、探测 HTTP、执行浅层爬取，并仅对 critical/high 级别运行 Nuclei。目标是在投入更长时间前，尽快暴露管理面板、已知 CVE、错误配置与默认凭据等“低垂果实”。

### 适用人群
适合刚接触新目标、需要快速判断是否值得深挖的漏洞赏金猎人，也适合渗透项目开始阶段的一轮快速摸排。

### 启用内容
- 全量子域发现（5 个工具默认上限）
- Puredns 泛解析过滤，减少垃圾子域
- httpx 启用核心探针（状态码、标题、技术识别、TLS）
- Katana 浅层爬取（深度 1，200 URL）做基础端点发现
- jsluice 快速分析已发现的 JS 文件（上限 50 个）提取密钥
- Nuclei 仅跑 critical + high，启用 DAST，高速输出结果
- Security Checks 用于发现 Header/TLS 配置问题

### 禁用内容
- 端口扫描（Naabu、Masscan、Nmap）：httpx 走常见 Web 端口即可，能节省大量时间
- Hakrawler：浅层场景下 Katana 已足够
- GAU、ParamSpider：归档检索耗时，但对快速收益帮助有限
- ffuf、Kiterunner：目录/API 爆破更慢，不适合初筛
- Arjun：参数发现偏慢，更适合深挖
- JS Recon：深度 JS 分析不适合快速扫描
- 全部 OSINT 增强：增加耗时但不直接产出漏洞
- CVE 查询与 MITRE 增强：Nuclei 已能直接发现可利用 CVE
- Banner 抓取：未做端口扫描时没有必要
- Wappalyzer：httpx 的技术识别已基本覆盖

### 工作方式
1. 子域发现工具并行枚举全部子域
2. httpx 对已发现主机的常见 Web 端口做探测
3. Katana 执行深度 1 的浅爬取，发现基础端点
4. jsluice 从 JS 文件中提取密钥与 URL
5. Nuclei 以 DAST 模式对全部已发现 URL 运行 critical/high 模板
6. Security Checks 标记缺失 Header、TLS 问题与暴露服务`,
  parameters: {
    // Modules: domain discovery + http probe + resource enum (katana only) + vuln scan
    // No port_scan (saves time), no js_recon (too slow)
    scanModules: ['domain_discovery', 'http_probe', 'resource_enum', 'vuln_scan'],

    // No stealth, no Tor
    stealthMode: false,
    useTorForRecon: false,

    // --- Subdomain Discovery: all tools at default limits ---
    subdomainDiscoveryEnabled: true,
    crtshEnabled: true,
    hackerTargetEnabled: true,
    knockpyReconEnabled: true,
    subfinderEnabled: true,
    amassEnabled: true,
    amassActive: false,
    amassBrute: false,
    amassTimeout: 10,
    purednsEnabled: true,
    useBruteforceForSubdomains: false,

    // --- WHOIS & DNS ---
    whoisEnabled: true,
    dnsEnabled: true,

    // --- DISABLE port scanning (httpx handles common web ports) ---
    naabuEnabled: false,
    masscanEnabled: false,
    nmapEnabled: false,

    // --- httpx: essential probes only, fast ---
    httpxEnabled: true,
    httpxThreads: 50,
    httpxTimeout: 10,
    httpxRetries: 2,
    httpxRateLimit: 100,
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
    httpxIncludeResponse: false,
    httpxIncludeResponseHeaders: false,

    // --- DISABLE Wappalyzer (httpx tech detect is enough) ---
    wappalyzerEnabled: false,

    // --- VHost & SNI: graph-only (skip 2300-prefix wordlist for speed) ---
    vhostSniEnabled: true,
    vhostSniTestL7: true,
    vhostSniTestL4: true,
    vhostSniUseDefaultWordlist: false,        // skip the 2300-entry default for speed
    vhostSniUseGraphCandidates: true,
    vhostSniInjectDiscovered: true,
    vhostSniConcurrency: 30,

    // --- DISABLE banner grabbing ---
    bannerGrabEnabled: false,

    // --- Katana: shallow, fast crawl ---
    katanaEnabled: true,
    katanaDepth: 1,
    katanaMaxUrls: 200,
    katanaRateLimit: 100,
    katanaTimeout: 600,
    katanaJsCrawl: true,
    katanaParallelism: 10,
    katanaConcurrency: 15,

    // --- DISABLE Hakrawler (Katana alone is sufficient) ---
    hakrawlerEnabled: false,
    hakrawlerParallelism: 5,

    // --- DISABLE ZAP Ajax Spider (browser crawl too slow for <15min budget) ---
    zapAjaxSpiderEnabled: false,

    // --- DISABLE GAU & ParamSpider (archive lookups too slow) ---
    gauEnabled: false,
    gauWorkers: 10,
    paramspiderEnabled: false,
    paramspiderWorkers: 8,

    // --- jsluice: quick pass on discovered JS ---
    jsluiceEnabled: true,
    jsluiceMaxFiles: 50,
    jsluiceExtractSecrets: true,
    jsluiceExtractUrls: true,
    jsluiceConcurrency: 5,

    // --- DISABLE JS Recon (too slow for quick scan) ---
    jsReconEnabled: false,

    aiSurfaceReconEnabled: false,
    // --- DISABLE directory fuzzing ---
    ffufEnabled: false,
    ffufParallelism: 4,

    // --- DISABLE API discovery ---
    kiterunnerEnabled: false,

    // --- DISABLE parameter discovery ---
    arjunEnabled: false,

    // --- Nuclei: critical + high only, DAST, fast ---
    nucleiEnabled: true,
    nucleiSeverity: ['critical', 'high'],
    nucleiRateLimit: 150,
    nucleiBulkSize: 50,
    nucleiConcurrency: 50,
    nucleiTimeout: 10,
    nucleiRetries: 1,
    nucleiDastMode: true,
    nucleiAutoUpdateTemplates: true,
    nucleiHeadless: false,
    nucleiSystemResolvers: true,
    nucleiFollowRedirects: true,
    nucleiMaxRedirects: 10,
    nucleiScanAllIps: false,
    nucleiInteractsh: true,

    // --- Subdomain Takeover: enabled (high-value bug bounty finding) ---
    subdomainTakeoverEnabled: true,
    subjackEnabled: true,
    nucleiTakeoversEnabled: true,
    takeoverSeverity: ['critical', 'high', 'medium'],

    // --- GraphQL: OFF by default. "Quick" preset skips niche scans that add
    //     30s-2min per BaseURL. Users can enable per-project if the target is GraphQL. ---

    // --- DISABLE CVE lookup and MITRE (Nuclei finds CVEs directly) ---
    cveLookupEnabled: false,
    mitreEnabled: false,

    // --- Security checks: enabled for quick header/TLS wins ---
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

    // --- GraphQL: explicit OFF so switching from a GraphQL-enabled preset resets cleanly ---
    graphqlSecurityEnabled: false,
    graphqlCopEnabled: false,
  },
}
