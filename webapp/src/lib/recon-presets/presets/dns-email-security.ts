import type { ReconPreset } from '../types'

export const DNS_EMAIL_SECURITY: ReconPreset = {
  id: 'dns-email-security',
  name: 'DNS 与邮件安全',
  icon: '',
  image: '/preset-mail-search.svg',
  shortDescription: '面向 DNS 基础设施和邮件安全的审计。全量子域发现、全记录类型解析、WHOIS、SPF/DMARC/DNSSEC、区域传送与 SMTP Open Relay 检测。',
  fullDescription: `### 流程目标
审计目标域名的 DNS 基础设施与邮件安全态势。该预设会尽可能发现全部子域、解析 A/AAAA/MX/TXT/NS/SOA/CNAME 等记录、执行 WHOIS 查询，并针对邮件伪造防护与 DNS 错误配置执行定向安全检查。Shodan 的 DNS 增强用于补充被动上下文。不做端口扫描、不做 Web 爬取，也不做漏洞扫描，专注 DNS 与邮件安全侦察。

### 适用人群
适合检查 SPF、DMARC、DKIM 防护的安全团队，验证 DNSSEC 部署的 DNS 管理员，做域名卫生检查的合规团队，以及在钓鱼演练前寻找区域传送与开放邮件中继问题的红队。

### 启用内容
- 全量子域发现，全部工具开启并提高结果上限
- Amass 主动探测与爆破，提高子域覆盖率
- PureDNS 做解析与泛解析过滤
- 启用子域爆破，寻找隐藏子域
- WHOIS 查询带重试，用于获取注册商与注册人信息
- DNS 解析带重试，用于完整枚举记录
- 针对 DNS 与邮件的安全检查：SPF 缺失、DMARC 缺失、DNSSEC 缺失、区域传送、SMTP Open Relay
- Shodan DNS 增强：反向 DNS 与 Domain DNS 信息

### 禁用内容
- 所有端口扫描器（Naabu、Masscan、Nmap）：重点不是端口，而是 DNS
- httpx 与 Wappalyzer：无需 Web 服务指纹识别
- Banner 抓取：不收集服务 Banner
- Web 爬虫（Katana、Hakrawler）：不抓取网页内容
- GAU、ParamSpider：不做被动 URL 发现
- jsluice、JS Recon：不做 JavaScript 分析
- 目录爆破/API 发现/参数发现（ffuf、Kiterunner、Arjun）
- Nuclei：不做 Web 漏洞检测
- CVE 查询与 MITRE 增强：与 DNS/邮件检查无关
- 所有 HTTP/Web 安全检查（WAF、TLS、CSP、Session 等）
- 除 Shodan 外的大多数 OSINT 提供方：DNS 场景下收益有限

### 工作方式
1. 子域发现阶段结合 crt.sh、HackerTarget、Knockpy、Subfinder、Amass 与 PureDNS，尽量枚举所有主机名
2. DNS 解析收集全部已发现子域的 A、AAAA、MX、TXT、NS、SOA、CNAME 记录
3. WHOIS 查询拉取注册商、注册人和到期信息
4. Security Checks 检查 SPF 缺失、DMARC 缺失、DNSSEC 缺失、区域传送错误配置与开放邮件中继
5. Shodan 的反向 DNS 与域名 DNS 增强补充被动 DNS 情报与历史记录`,
  parameters: {
    // Modules: domain_discovery + vuln_scan (SPF/DMARC/DNSSEC/zone-transfer/SMTP
    // security checks all live inside vuln_scan). No port scanning, no web probing.
    scanModules: ['domain_discovery', 'vuln_scan'],

    stealthMode: false,
    useTorForRecon: false,

    // --- Subdomain Discovery: ALL tools, max results, aggressive ---
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
    amassTimeout: 15,
    purednsEnabled: true,
    useBruteforceForSubdomains: true,

    // --- WHOIS and DNS: enabled with retries ---
    whoisEnabled: true,
    whoisMaxRetries: 6,
    dnsEnabled: true,
    dnsMaxRetries: 5,

    // --- Port Scanning: ALL disabled ---
    naabuEnabled: false,
    masscanEnabled: false,
    nmapEnabled: false,

    // --- httpx: disabled ---
    httpxEnabled: false,

    // --- Wappalyzer: disabled ---
    wappalyzerEnabled: false,

    // --- Banner Grabbing: disabled ---
    bannerGrabEnabled: false,

    // --- Web Crawlers: ALL disabled ---
    katanaEnabled: false,
    hakrawlerEnabled: false,
    zapAjaxSpiderEnabled: false,

    // --- Passive URL discovery: disabled ---
    gauEnabled: false,
    paramspiderEnabled: false,

    // --- JS analysis: disabled ---
    jsluiceEnabled: false,
    jsReconEnabled: false,

    // --- Directory/API/Parameter fuzzing: disabled ---
    ffufEnabled: false,
    kiterunnerEnabled: false,
    arjunEnabled: false,

    // --- Nuclei: disabled ---
    nucleiEnabled: false,

    // --- CVE Lookup: disabled ---
    cveLookupEnabled: false,

    // --- MITRE: disabled ---
    mitreEnabled: false,

    // --- Security Checks: DNS and email checks only ---
    securityCheckEnabled: true,
    securityCheckSpfMissing: true,
    securityCheckDmarcMissing: true,
    securityCheckDnssecMissing: true,
    securityCheckZoneTransfer: true,
    securityCheckSmtpOpenRelay: true,
    securityCheckDirectIpHttp: false,
    securityCheckDirectIpHttps: false,
    securityCheckIpApiExposed: false,
    securityCheckWafBypass: false,
    securityCheckTlsExpiringSoon: false,
    securityCheckMissingReferrerPolicy: false,
    securityCheckMissingPermissionsPolicy: false,
    securityCheckMissingCoop: false,
    securityCheckMissingCorp: false,
    securityCheckMissingCoep: false,
    securityCheckCacheControlMissing: false,
    securityCheckLoginNoHttps: false,
    securityCheckSessionNoSecure: false,
    securityCheckSessionNoHttponly: false,
    securityCheckBasicAuthNoTls: false,
    securityCheckAdminPortExposed: false,
    securityCheckDatabaseExposed: false,
    securityCheckRedisNoAuth: false,
    securityCheckKubernetesApiExposed: false,
    securityCheckCspUnsafeInline: false,
    securityCheckInsecureFormAction: false,
    securityCheckNoRateLimiting: false,
    securityCheckTimeout: 15,
    securityCheckMaxWorkers: 10,

    // --- OSINT: Shodan DNS enrichment only ---
    osintEnrichmentEnabled: true,
    shodanEnabled: true,
    shodanHostLookup: false,
    shodanReverseDns: true,
    shodanDomainDns: true,
    shodanPassiveCves: false,

    // Disable all other OSINT providers
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
