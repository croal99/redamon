import type { ReconPreset } from '../types'

export const INFRASTRUCTURE_MAPPER: ReconPreset = {
  id: 'infrastructure-mapper',
  name: '基础设施测绘',
  icon: '',
  image: '/preset-network.svg',
  shortDescription: '绘制网络边界。全量端口扫描、服务识别、Banner 抓取、Shodan 增强与 CVE 查询。',
  fullDescription: `### 流程目标
绘制整个网络边界：每个开放端口、每个运行中的服务、每条版本字符串。该预设使用三种端口扫描器做最大覆盖，以 Nmap NSE 补充漏洞线索，使用 Banner 抓取识别非 HTTP 服务，并通过 Shodan/Censys 做被动增强。不做 Web 爬取与目录爆破，专注基础设施侦察。

### 适用人群
适合在进入服务专项测试前，需要先摸清外网或内网边界暴露情况的网络渗透测试人员与基础设施安全团队。

### 启用内容
- 全量子域发现（全部工具，高上限）
- Naabu SYN 扫描 Top 1000 端口 + Masscan 高速端口发现
- Nmap 版本识别、NSE 漏洞脚本与激进时序
- httpx 全探针，用于发现 Web 服务与技术栈
- Wappalyzer 识别 Web 技术栈
- Banner 抓取所有非 HTTP 服务
- Shodan 与 Censys 做主机增强
- CVE 查询（每个服务最多 40 条）
- MITRE CWE/CAPEC 增强
- 全部基础设施暴露类安全检查

### 禁用内容
- Web 爬虫（Katana、Hakrawler）：目标不是页面内容，而是网络服务
- 目录爆破与 API 发现（ffuf、Kiterunner）：属于 Web 层
- 参数发现（Arjun、ParamSpider）：与基础设施测绘无关
- GAU：历史 URL 对网络服务帮助有限
- jsluice、JS Recon：不做 JS 分析
- Nuclei：这个预设重在建图，漏洞测试可留到后续
- 除 Shodan 与 Censys 外的大多数 OSINT：与基础设施场景相关性较低

### 工作方式
1. 子域发现枚举全部主机名并解析 IP
2. Naabu 与 Masscan 并行扫描端口，兼顾速度与覆盖
3. Nmap 对开放端口做服务版本与 NSE 探测
4. httpx 对 Web 端口做完整指纹识别
5. Banner 抓取非 HTTP 端口，识别 SSH、FTP、数据库等服务
6. Shodan 与 Censys 补充地理位置、ISP、历史 Banner 与被动 CVE
7. CVE 查询将服务版本映射到已知漏洞
8. MITRE 增强按 CWE 与攻击模式分类
9. Security Checks 标记暴露管理端口、数据库、邮件中继与错误配置服务`,
  parameters: {
    // Modules: domain_discovery + port_scan + http_probe + vuln_scan
    // vuln_scan is required for CVE lookup, MITRE enrichment, and security checks
    // (Nuclei itself is disabled below). No resource_enum, no js_recon.
    scanModules: ['domain_discovery', 'port_scan', 'http_probe', 'vuln_scan'],

    stealthMode: false,
    useTorForRecon: false,

    // --- Subdomain Discovery: all tools, high limits ---
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
    amassBrute: false,
    amassMaxResults: 10000,
    amassTimeout: 15,
    purednsEnabled: true,
    useBruteforceForSubdomains: false,

    whoisEnabled: true,
    dnsEnabled: true,

    // --- Naabu: SYN scan, high rate ---
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

    // --- Masscan: high rate for speed ---
    masscanEnabled: true,
    masscanTopPorts: '1000',
    masscanRate: 5000,
    masscanBanners: true,
    masscanWait: 10,
    masscanRetries: 2,

    // --- Nmap: version detection + NSE scripts, aggressive timing ---
    nmapEnabled: true,
    nmapVersionDetection: true,
    nmapScriptScan: true,
    nmapTimingTemplate: 'T4',
    nmapTimeout: 900,
    nmapHostTimeout: 450,

    // --- httpx: all probes for web service fingerprinting ---
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
    httpxIncludeResponse: false,
    httpxIncludeResponseHeaders: true,

    // --- Wappalyzer: enabled for tech detection ---
    wappalyzerEnabled: true,
    wappalyzerMinConfidence: 30,
    wappalyzerAutoUpdate: true,

    // --- Banner Grabbing: high threads, large buffer ---
    bannerGrabEnabled: true,
    bannerGrabTimeout: 10,
    bannerGrabThreads: 30,
    bannerGrabMaxLength: 1500,

    // --- DISABLE all web crawlers ---
    katanaEnabled: false,
    hakrawlerEnabled: false,
    zapAjaxSpiderEnabled: false,

    // --- DISABLE archive/passive URL discovery ---
    gauEnabled: false,
    paramspiderEnabled: false,

    // --- DISABLE JS analysis ---
    jsluiceEnabled: false,
    jsReconEnabled: false,

    // --- DISABLE directory/API fuzzing ---
    ffufEnabled: false,
    kiterunnerEnabled: false,

    // --- DISABLE parameter discovery ---
    arjunEnabled: false,

    // --- VHost & SNI: maps reverse-proxy / ingress topology, no vuln testing ---
    vhostSniEnabled: true,
    vhostSniTestL7: true,
    vhostSniTestL4: true,                    // Reveals which IPs are reverse proxies vs direct backends
    vhostSniUseDefaultWordlist: true,
    vhostSniUseGraphCandidates: true,
    vhostSniInjectDiscovered: true,

    // --- DISABLE Nuclei (mapping, not vuln testing) ---
    nucleiEnabled: false,

    // --- CVE Lookup: high max for comprehensive mapping ---
    cveLookupEnabled: true,
    cveLookupMaxCves: 40,
    cveLookupMinCvss: 0.0,

    // --- MITRE: enabled ---
    mitreEnabled: true,
    mitreAutoUpdateDb: true,
    mitreIncludeCwe: true,
    mitreIncludeCapec: true,
    mitreEnrichRecon: true,

    // --- Security Checks: all infrastructure checks ---
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

    // --- OSINT: Shodan + Censys only (infra-relevant) ---
    osintEnrichmentEnabled: true,
    shodanEnabled: true,
    shodanHostLookup: true,
    shodanReverseDns: true,
    shodanDomainDns: false,
    shodanPassiveCves: true,

    censysEnabled: true,

    // Disable non-infrastructure OSINT
    urlscanEnabled: false,
    otxEnabled: false,
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
