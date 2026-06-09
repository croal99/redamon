import type { ReconPreset } from '../types'

export const RED_TEAM_OPERATOR: ReconPreset = {
  id: 'red-team-operator',
  name: '红队行动模式',
  icon: '',
  image: '/preset-skull.svg',
  shortDescription: '在隐蔽性与主动验证之间做平衡。Connect 扫描、低速 httpx/Katana、仅 critical 的 Nuclei、Tor 路由与精选 OSINT，适合授权红队行动。',
  fullDescription: `### 流程目标
在隐蔽性与可执行结果之间取得平衡。该预设不会完全被动，而是使用经过严格限速的主动探测：使用 Connect Scan 代替 SYN、Nuclei 仅保留 critical 级别且低并发、爬取也做速率限制，所有主动流量统一走 Tor。目标是在尽量降低告警概率的前提下，建立可落地的攻击面图谱。

### 适用人群
适合已获授权、允许一定主动探测但仍需规避检测的红队人员，也适合不能轻易触发 IDS/IPS/WAF 规则、却又需要比纯被动扫描更多信号的渗透测试人员。

### 启用内容
- 通过被动源做全量子域发现，不启用爆破
- Naabu 使用 TCP Connect Scan，速率 50，线程 5，避免裸 SYN 流量
- httpx 仅保留关键探针，3 线程、5 req/s
- Katana 浅层爬取（深度 1，100 URL，5 req/s）
- GAU 使用全部归档提供方，最多 3000 URL
- ParamSpider 从 Wayback CDX 被动挖掘参数
- jsluice 最多分析 30 个 JS 文件，提取端点与密钥
- Arjun 被动模式
- Nuclei 仅 critical，5 req/s、并发 3，排除 dos/fuzz/intrusive 标签
- CVE 查询与 MITRE 增强
- 启用 Shodan、URLScan、OTX、Censys 做精选 OSINT 增强
- 所有主动探测均经 Tor 路由

### 禁用内容
- Masscan：包量过大，极易被发现
- Nmap：服务识别与 NSE 噪音较高
- Hakrawler：爬取模式更激进
- ffuf：高请求量，容易被 WAF 识别
- Kiterunner：流量特征明显的 API 爆破
- JS Recon：需要从目标下载大量文件
- Banner 抓取：会留下明确连接日志
- Wappalyzer：需要完整 HTTP 响应，增加流量
- Security Checks：部分检测会直接连接目标服务
- httpx 的 JARM、favicon、ASN/CDN 等额外探针
- Nuclei DAST、Interactsh 与 Headless
- FOFA、Netlas、VirusTotal、ZoomEye、CriminalIP、Uncover：缩小 OSINT 足迹

### 工作方式
1. 子域发现完全依赖被动来源：证书日志、DNS 数据库与 OSINT API
2. DNS 解析与 Puredns 使用公共解析器
3. Naabu 以 TCP Connect Scan 低速运行，避免半开 SYN 特征
4. httpx 通过 Tor 低速探测主机，收集状态、标题、技术栈、IP、CNAME 与 TLS 信息
5. Katana 通过 Tor 做深度 1 浅爬取，只发现最直接的端点
6. GAU 从归档中拉取历史 URL，不接触目标
7. ParamSpider 从归档中挖参数
8. jsluice 从爬取发现的少量 JS 文件中提取端点与密钥
9. Arjun 基于归档响应做被动参数发现
10. Nuclei 仅执行 critical 模板，低速低并发，经 Tor 运行，并完全排除侵入性标签
11. CVE 查询为已发现服务补充已知漏洞上下文
12. MITRE 为结果加入 ATT&CK 语境
13. Shodan、URLScan、OTX 与 Censys 通过第三方 API 增强资产画像`,
  parameters: {
    // Modules: vuln_scan included for critical-only Nuclei
    scanModules: ['domain_discovery', 'port_scan', 'http_probe', 'resource_enum', 'vuln_scan'],

    // Stealth mode off (we handle throttling manually), Tor on
    stealthMode: false,
    useTorForRecon: true,

    // --- Subdomain Discovery: all passive, NO brute force ---
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

    // --- Port Scanning: Naabu connect scan, throttled ---
    naabuEnabled: true,
    naabuPassiveMode: false,
    naabuScanType: 'c',
    naabuRateLimit: 50,
    naabuThreads: 5,
    naabuRetries: 1,
    naabuTimeout: 10000,

    // --- DISABLE noisy port scanners ---
    masscanEnabled: false,
    nmapEnabled: false,

    // --- httpx: essential probes, throttled ---
    httpxEnabled: true,
    httpxThreads: 3,
    httpxRateLimit: 5,
    httpxTimeout: 15,
    httpxRetries: 2,
    httpxProbeStatusCode: true,
    httpxProbeContentType: true,
    httpxProbeTitle: true,
    httpxProbeServer: true,
    httpxProbeTechDetect: true,
    httpxProbeIp: true,
    httpxProbeCname: true,
    httpxProbeTlsInfo: true,
    httpxProbeContentLength: true,
    httpxProbeResponseTime: true,
    httpxProbeWordCount: false,
    httpxProbeLineCount: false,
    httpxProbeTlsGrab: false,
    httpxProbeFavicon: false,
    httpxProbeJarm: false,
    httpxProbeAsn: false,
    httpxProbeCdn: false,
    httpxProbeHash: '',
    httpxIncludeResponse: false,
    httpxIncludeResponseHeaders: false,
    httpxFollowRedirects: true,
    httpxMaxRedirects: 10,

    // --- DISABLE Wappalyzer ---
    wappalyzerEnabled: false,

    // --- DISABLE banner grabbing ---
    bannerGrabEnabled: false,

    // --- Katana: shallow and throttled ---
    katanaEnabled: true,
    katanaDepth: 1,
    katanaMaxUrls: 100,
    katanaRateLimit: 5,
    katanaTimeout: 1800,
    katanaJsCrawl: false,

    // --- DISABLE Hakrawler ---
    hakrawlerEnabled: false,
    zapAjaxSpiderEnabled: false,

    // --- GAU: passive archive discovery, all providers ---
    gauEnabled: true,
    gauProviders: ['wayback', 'commoncrawl', 'otx', 'urlscan'],
    gauMaxUrls: 3000,
    gauVerifyUrls: false,
    gauDetectMethods: false,
    gauFilterDeadEndpoints: false,

    // --- ParamSpider: passive Wayback parameter mining ---
    paramspiderEnabled: true,

    // --- jsluice: moderate extraction ---
    jsluiceEnabled: true,
    jsluiceMaxFiles: 30,
    jsluiceExtractSecrets: true,
    jsluiceExtractUrls: true,
    jsluiceConcurrency: 2,

    // --- DISABLE JS Recon ---
    jsReconEnabled: false,

    // --- DISABLE directory fuzzing ---
    ffufEnabled: false,

    // --- DISABLE API discovery ---
    kiterunnerEnabled: false,

    // --- Arjun: passive mode only ---
    arjunEnabled: true,
    arjunPassive: true,

    // --- VHost & SNI: throttled hidden vhost discovery (no L4, fewer probes) ---
    vhostSniEnabled: true,
    vhostSniTestL7: true,
    vhostSniTestL4: false,                   // SNI brute is louder; skip on red-team OPSEC
    vhostSniUseDefaultWordlist: false,       // Default 2300 entries is too noisy
    vhostSniUseGraphCandidates: true,        // Only test what's already in the graph
    vhostSniConcurrency: 5,                  // Slow + quiet
    vhostSniInjectDiscovered: true,

    // --- Nuclei: critical only, throttled, no intrusive ---
    nucleiEnabled: true,
    nucleiSeverity: ['critical'],
    nucleiRateLimit: 5,
    nucleiBulkSize: 3,
    nucleiConcurrency: 3,
    nucleiTimeout: 15,
    nucleiRetries: 1,
    nucleiDastMode: false,
    nucleiHeadless: false,
    nucleiInteractsh: false,
    nucleiScanAllIps: false,
    nucleiAutoUpdateTemplates: true,
    nucleiFollowRedirects: true,
    nucleiMaxRedirects: 10,
    nucleiSystemResolvers: true,
    nucleiExcludeTags: ['dos', 'fuzz', 'intrusive'],

    // --- GraphQL: OFF by default. Red team prioritises stealth; pattern-based
    //     GraphQL discovery generates 4-12 extra 404s per BaseURL (IDS/WAF signal).
    //     Enable per-project only when GraphQL is a known target. ---

    // --- CVE lookup ---
    cveLookupEnabled: true,
    cveLookupMaxCves: 20,

    // --- MITRE enrichment ---
    mitreEnabled: true,

    // --- DISABLE security checks ---
    securityCheckEnabled: false,

    // --- OSINT: selective providers ---
    osintEnrichmentEnabled: true,

    shodanEnabled: true,
    shodanHostLookup: true,
    shodanReverseDns: true,
    shodanDomainDns: false,
    shodanPassiveCves: true,

    urlscanEnabled: true,
    urlscanMaxResults: 3000,

    otxEnabled: true,

    censysEnabled: true,

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
