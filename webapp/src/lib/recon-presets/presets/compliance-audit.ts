import type { ReconPreset } from '../types'

export const COMPLIANCE_AUDIT: ReconPreset = {
  id: 'compliance-audit',
  name: '合规与请求头审计',
  icon: '',
  image: '/preset-certificate.svg',
  shortDescription: '验证安全基线。启用完整 Header/TLS 探针、SPF/DMARC/DNSSEC 检查、Wappalyzer 技术识别，以及 Nuclei 配置错误扫描。',
  fullDescription: `### 流程目标
通过审计 HTTP Header、TLS 证书、DNS 安全记录与常见错误配置来验证目标的安全基线。该预设聚焦于合规相关检查，例如缺失安全 Header、证书即将过期、SPF/DMARC/DNSSEC 缺失，以及暴露服务，而不会做激进爬取或模糊测试。

### 适用人群
适合做合规审计的安全团队、校验加固基线的蓝队，以及产出安全态势报告的顾问。可用于周期性检查 OWASP Secure Headers、CIS Benchmark 或内部安全策略落实情况。

### 启用内容
- 全量子域发现（全部工具，默认上限）
- WHOIS 与 DNS 查询，用于补充域名上下文
- httpx 开启全部 Header 与指纹探针，包括状态码、内容类型、Server、响应时间、TLS、JARM、ASN、CDN、favicon 与技术识别
- 捕获响应 Header，便于离线分析
- Wappalyzer 识别框架、CMS 与服务器软件
- 启用全部 27 项安全检查，包括 SPF/DMARC/DNSSEC、TLS 过期、缺失安全 Header、Cookie 标志、明文 Basic Auth、暴露管理端口、开放数据库、邮件中继等
- Nuclei 仅使用 misconfig 与 exposure 标签，不启用 DAST、Interactsh 或 Headless

### 禁用内容
- 端口扫描（Naabu、Masscan、Nmap）：重点不是端口测绘，而是 Web 安全姿态
- Web 爬虫（Katana、Hakrawler）：无需深度爬取
- 归档与被动 URL 发现（GAU、ParamSpider）：不以 URL 收集为目标
- JavaScript 分析（jsluice、JS Recon）：不做前端密钥/逻辑挖掘
- 目录与 API 爆破（ffuf、Kiterunner、Arjun）：不进行暴力发现
- Banner 抓取：不探测原始 socket
- CVE 查询与 MITRE 增强：重点不在漏洞枚举
- 全部 OSINT 提供方：被动增强在这里不是核心需求

### 工作方式
1. 子域发现枚举目标域下的全部主机名
2. DNS 与 WHOIS 收集注册信息与解析数据
3. httpx 对每个主机启用全部指纹能力，收集 Header、TLS、JARM、ASN、CDN 与技术信息
4. Wappalyzer 识别各主机运行的技术栈
5. 27 项安全检查验证 Header、TLS、DNS 安全记录、Cookie 标志与暴露服务
6. Nuclei 执行配置错误与暴露类模板
7. 所有结果进入图谱，用于展示完整的合规安全态势`,
  parameters: {
    // Modules: domain_discovery + http_probe + vuln_scan (nuclei misconfig)
    scanModules: ['domain_discovery', 'http_probe', 'vuln_scan'],

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
    amassTimeout: 15,
    purednsEnabled: true,
    useBruteforceForSubdomains: false,

    whoisEnabled: true,
    dnsEnabled: true,

    // --- Port Scanning: ALL disabled ---
    naabuEnabled: false,
    masscanEnabled: false,
    nmapEnabled: false,

    // --- httpx: all probes enabled for header auditing ---
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
    httpxIncludeResponse: false,
    httpxIncludeResponseHeaders: true,

    // --- Wappalyzer: enabled for tech detection ---
    wappalyzerEnabled: true,
    wappalyzerMinConfidence: 30,
    wappalyzerAutoUpdate: true,

    // --- Banner Grabbing: disabled ---
    bannerGrabEnabled: false,

    // --- VHost & SNI: routing inconsistency (host_header_bypass) IS a compliance finding ---
    vhostSniEnabled: true,
    vhostSniTestL7: true,
    vhostSniTestL4: true,
    vhostSniUseDefaultWordlist: true,
    vhostSniUseGraphCandidates: true,
    vhostSniInjectDiscovered: false,    // compliance audits report findings; no need to feed downstream tools

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

    aiSurfaceReconEnabled: false,
    // --- DISABLE directory/API fuzzing ---
    ffufEnabled: false,
    kiterunnerEnabled: false,

    // --- DISABLE parameter discovery ---
    arjunEnabled: false,

    // --- Nuclei: misconfig and exposure focus ---
    nucleiEnabled: true,
    nucleiSeverity: ['critical', 'high', 'medium'],
    nucleiTags: ['misconfig', 'exposure'],
    nucleiRateLimit: 50,
    nucleiBulkSize: 15,
    nucleiConcurrency: 15,
    nucleiTimeout: 10,
    nucleiRetries: 2,
    nucleiDastMode: false,
    nucleiHeadless: false,
    nucleiAutoUpdateTemplates: true,
    nucleiSystemResolvers: true,
    nucleiFollowRedirects: true,
    nucleiMaxRedirects: 10,
    nucleiScanAllIps: false,
    nucleiInteractsh: false,

    // --- GraphQL: OFF by default. Compliance audits have defined scope; no crawlers
    //     enabled (Katana/Hakrawler off) means GraphQL discovery has minimal signal.
    //     If GraphQL is in scope, enable per-project. ---

    // --- CVE Lookup: disabled ---
    cveLookupEnabled: false,

    // --- MITRE: disabled ---
    mitreEnabled: false,

    // --- Security Checks: ALL 27 enabled ---
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

    // --- OSINT: all disabled ---
    osintEnrichmentEnabled: false,
    shodanEnabled: false,
    censysEnabled: false,
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
