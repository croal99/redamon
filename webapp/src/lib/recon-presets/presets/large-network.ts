import type { ReconPreset } from '../types'

export const LARGE_NETWORK: ReconPreset = {
  id: 'large-network',
  name: '网络边界 - 大规模扫描',
  icon: '',
  image: '/preset-radar-2.svg',
  shortDescription: '面向大规模 IP 边界的扫描。Masscan 10k pps、Naabu 校验、Nmap T4 服务识别、Banner 抓取、Shodan/Censys 增强与 CVE 查询。',
  fullDescription: `### 流程目标
以高速度扫描大范围 IP 段与 CIDR。该预设为 IP 模式侦察而设计：Masscan 以 10000 pps 做高速端口发现，Naabu 以 SYN 方式复核开放端口，Nmap 用激进 T4 时序识别服务版本，Banner 抓取识别非 HTTP 协议服务，Shodan 与 Censys 提供被动增强。不做 Web 爬取、不做爆破，也不做 JavaScript 分析，专注大规模网络层侦察。

### 适用人群
适合需要绘制大规模外网边界的网络安全团队与渗透测试人员，例如企业网段、多个 CIDR、云厂商 IP 段等，以速度优先于隐蔽性的场景。

### 启用内容
- 子域发现（用于反向 DNS 与主机名归属补充）
- WHOIS 与 DNS 查询，用于 IP 归属分析
- Naabu SYN 扫描 Top 1000 端口，高速复核开放端口
- Masscan 10000 pps，并启用 Banner 捕获
- Nmap 版本识别、NSE 脚本、T4 时序与更长超时
- httpx 75 线程，启用 ASN/CDN/JARM/TLS 等完整指纹探针
- Wappalyzer 技术识别
- Banner 抓取 40 线程、大缓冲
- Shodan 与 Censys 做 IP 画像增强
- CVE 查询与 MITRE 增强
- 全部 27 项安全检查

### 禁用内容
- Web 爬虫（Katana、Hakrawler）：不是网站内容发现，而是端口层扫描
- 目录爆破与 API 发现（ffuf、Kiterunner）：对大规模网络边界意义不大
- 参数发现（Arjun、ParamSpider）：不适用于 IP 模式扫描
- GAU：历史 URL 与网络基础设施关系不大
- jsluice、JS Recon：不适用
- Nuclei：此预设更适合先建图，再做专项漏洞检测
- 除 Shodan 与 Censys 外的大多数 OSINT：对 IP/基础设施价值较低

### 工作方式
1. 子域发现用于解析主机名并补充 IP 清单
2. Masscan 先以 10000 pps 快速扫出开放端口与 Banner
3. Naabu 再次用 SYN 探测验证开放端口，过滤误报
4. Nmap 对确认端口做版本与 NSE 脚本探测
5. httpx 对所有 Web 端口组合做完整指纹识别
6. Banner 抓取高并发连接非 HTTP 端口并识别服务
7. Shodan 与 Censys 为 IP 增强地理位置、ISP、历史数据与已知 CVE
8. CVE 查询把检测到的服务版本映射到已知漏洞
9. MITRE 增强按 CWE 与攻击模式归类
10. Security Checks 标记暴露管理端口、数据库、中继与错误配置`,
  parameters: {
    // Modules: domain_discovery + port_scan + http_probe + vuln_scan
    // vuln_scan is required for CVE lookup, MITRE enrichment, and security checks
    // (Nuclei itself is disabled below). No resource_enum, no js_recon.
    scanModules: ['domain_discovery', 'port_scan', 'http_probe', 'vuln_scan'],

    stealthMode: false,
    useTorForRecon: false,

    // --- Subdomain Discovery: all tools enabled (reverse DNS useful in IP mode) ---
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

    whoisEnabled: true,
    dnsEnabled: true,
    dnsMaxWorkers: 100,

    // --- Naabu: SYN scan, high rate and threads ---
    naabuEnabled: true,
    naabuPassiveMode: false,
    naabuScanType: 's',
    naabuTopPorts: '1000',
    naabuRateLimit: 1500,
    naabuThreads: 50,
    naabuTimeout: 10000,
    naabuRetries: 2,
    naabuExcludeCdn: false,
    naabuDisplayCdn: true,
    naabuSkipHostDiscovery: true,
    naabuVerifyPorts: true,

    // --- Masscan: very high rate for large-scale scanning ---
    masscanEnabled: true,
    masscanTopPorts: '1000',
    masscanRate: 10000,
    masscanBanners: true,
    masscanWait: 10,
    masscanRetries: 2,

    // --- Nmap: version detection + NSE scripts, T4 timing, extended timeouts ---
    nmapEnabled: true,
    nmapVersionDetection: true,
    nmapScriptScan: true,
    nmapTimingTemplate: 'T4',
    nmapTimeout: 1200,
    nmapHostTimeout: 600,
    nmapParallelism: 4,

    // --- httpx: high throughput with full fingerprinting ---
    httpxEnabled: true,
    httpxThreads: 75,
    httpxTimeout: 15,
    httpxRetries: 2,
    httpxRateLimit: 150,
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

    // --- Banner Grabbing: high threads for large-scale scanning ---
    bannerGrabEnabled: true,
    bannerGrabTimeout: 10,
    bannerGrabThreads: 40,
    bannerGrabMaxLength: 1500,

    // --- DISABLE all web crawlers ---
    katanaEnabled: false,
    katanaParallelism: 10,
    katanaConcurrency: 20,
    hakrawlerEnabled: false,
    zapAjaxSpiderEnabled: false,
    hakrawlerParallelism: 6,

    // --- DISABLE archive/passive URL discovery ---
    gauEnabled: false,
    gauWorkers: 15,
    paramspiderEnabled: false,
    paramspiderWorkers: 10,

    // --- DISABLE JS analysis ---
    jsluiceEnabled: false,
    jsReconEnabled: false,

    aiSurfaceReconEnabled: false,
    // --- DISABLE directory/API fuzzing ---
    ffufEnabled: false,
    kiterunnerEnabled: false,

    // --- DISABLE parameter discovery ---
    arjunEnabled: false,

    // --- DISABLE Nuclei (mapping, not vuln testing) ---
    nucleiEnabled: false,

    // --- VHost & SNI: explicitly disabled — per-IP serial loop × thousands of IPs
    //     in a /16 would run for hours/days. Use partial recon on specific IPs instead. ---
    vhostSniEnabled: false,

    // --- CVE Lookup: comprehensive, all CVSS scores ---
    cveLookupEnabled: true,
    cveLookupMaxCves: 40,
    cveLookupMinCvss: 0.0,

    // --- MITRE: enabled ---
    mitreEnabled: true,
    mitreAutoUpdateDb: true,
    mitreIncludeCwe: true,
    mitreIncludeCapec: true,
    mitreEnrichRecon: true,

    // --- Security Checks: all checks, high worker count ---
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
    securityCheckMaxWorkers: 20,

    // --- OSINT: Shodan + Censys only (infrastructure-relevant) ---
    osintEnrichmentEnabled: true,
    shodanEnabled: true,
    shodanHostLookup: true,
    shodanReverseDns: true,
    shodanDomainDns: false,
    shodanPassiveCves: true,

    censysEnabled: true,
    censysWorkers: 8,

    // Disable non-infrastructure OSINT
    urlscanEnabled: false,
    otxEnabled: false,
    otxWorkers: 8,
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
