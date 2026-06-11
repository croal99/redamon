import type { ReconPreset } from '../types'

export const STEALTH_RECON: ReconPreset = {
  id: 'stealth-recon',
  name: '隐匿侦察',
  icon: '',
  image: '/preset-ghost.svg',
  shortDescription: '尽量降低被发现概率。所有流量走 Tor，优先使用被动工具，主动探针极低速，适合监控严格的目标。',
  fullDescription: `### 流程目标
以尽可能小的检测足迹收集情报。所有流量均经 Tor，主动工具被压到接近被动的速率，所有容易制造明显流量模式的行为（爆破、激进爬取、高噪音探测）都会被关闭。目标是在低于检测阈值的同时尽可能多地了解目标。

### 适用人群
适合对有活跃 SOC、IDS/IPS 或 WAF 速率限制的目标做授权侦察的红队，也适合在正式开始前不希望过早触发告警的初期摸排，或用于测试蓝队检测能力。

### 启用内容
- 通过被动来源做全量子域发现，不启用爆破
- Naabu 被动模式（仅查询 Shodan InternetDB）
- httpx 仅保留最少探针，1 线程、2 req/s
- Katana 深度 1，最多 50 URL，2 req/s
- GAU 使用全部归档提供方，完全被动
- ParamSpider 查询 Wayback CDX，不接触目标
- jsluice 最多分析 20 个 JS 文件
- Arjun 被动模式
- Nuclei 仅 critical/high，5 req/s，并发 2，不启用 DAST、Interactsh，排除 intrusive/fuzz/dos 标签
- CVE 查询与 MITRE 增强
- 全部 OSINT 提供方，但降低结果上限
- Shodan 全能力开启

### 禁用内容
- Masscan 与 Nmap：主动端口扫描流量明显
- Hakrawler：爬取模式较激进
- ffuf：高请求量，容易被检测
- Kiterunner：暴力 API 发现
- JS Recon：会从目标下载大量文件
- Banner 抓取：直接连接服务会留下日志
- Wappalyzer：依赖完整 HTTP 响应
- Security Checks：部分检查会直接触达目标
- Amass 主动模式与爆破
- Nuclei DAST、Interactsh 以及 intrusive/fuzz/dos 模板

### 工作方式
1. 子域发现完全依赖证书日志、DNS 数据库与 OSINT API
2. DNS 解析与 Puredns 只使用公共解析器
3. Naabu 查询 Shodan InternetDB 中历史开放端口，不向目标发包
4. httpx 通过 Tor 以 1 线程、2 req/s 的速度低频探测主机
5. Katana 通过 Tor 做浅层爬取，发现最直接的端点
6. GAU 与 ParamSpider 从 Web 归档中拉取历史 URL 与参数，不接触目标
7. jsluice 从少量 JS 文件中提取端点
8. Arjun 从归档响应中被动推断参数
9. Nuclei 仅运行 critical/high 模板，低速经 Tor 执行，并排除侵入性模板
10. OSINT 提供方通过第三方 API 对资产做低强度增强
11. CVE 与 MITRE 增强在离线/API 侧补充漏洞映射`,
  parameters: {
    // Modules: include vuln_scan so the throttled Nuclei config below (critical/high,
    // 5 rps, 2 concurrent, no DAST/Interactsh) plus CVE lookup and MITRE enrichment
    // actually execute. No js_recon (too many downloads).
    scanModules: ['domain_discovery', 'port_scan', 'http_probe', 'resource_enum', 'vuln_scan'],

    // Stealth + Tor: core of this preset
    stealthMode: true,
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
    dnsMaxWorkers: 5,
    dnsRecordParallelism: false,

    // --- Port Scanning: Naabu PASSIVE ONLY (InternetDB) ---
    naabuEnabled: true,
    naabuPassiveMode: true,
    naabuScanType: 'c',
    naabuRateLimit: 2,
    naabuThreads: 1,

    // --- DISABLE active port scanners ---
    masscanEnabled: false,
    nmapEnabled: false,
    nmapParallelism: 1,

    // --- httpx: minimal probes, throttled ---
    httpxEnabled: true,
    httpxThreads: 1,
    httpxRateLimit: 2,
    httpxProbeStatusCode: true,
    httpxProbeTitle: true,
    httpxProbeTechDetect: true,
    httpxProbeIp: true,
    httpxProbeTlsInfo: true,
    httpxProbeJarm: false,
    httpxProbeFavicon: false,
    httpxProbeAsn: false,
    httpxProbeCdn: false,
    httpxIncludeResponse: false,
    httpxIncludeResponseHeaders: false,

    // --- DISABLE Wappalyzer ---
    wappalyzerEnabled: false,

    // --- DISABLE banner grabbing ---
    bannerGrabEnabled: false,

    // --- Katana: shallow and throttled ---
    katanaEnabled: true,
    katanaDepth: 1,
    katanaMaxUrls: 50,
    katanaRateLimit: 2,
    katanaJsCrawl: false,
    katanaParallelism: 1,
    katanaConcurrency: 1,

    // --- DISABLE Hakrawler ---
    hakrawlerEnabled: false,

    // --- DISABLE ZAP Ajax Spider (browser crawling is loud and incompatible with Tor) ---
    zapAjaxSpiderEnabled: false,

    // --- GAU: passive archive discovery, all providers ---
    gauEnabled: true,
    gauProviders: ['wayback', 'commoncrawl', 'otx', 'urlscan'],
    gauMaxUrls: 5000,
    gauTimeout: 120,
    gauThreads: 5,
    gauVerbose: false,
    gauVerifyUrls: false,
    gauDetectMethods: false,
    gauFilterDeadEndpoints: false,
    gauWorkers: 1,

    // --- ParamSpider: passive Wayback parameter mining ---
    paramspiderEnabled: true,
    paramspiderTimeout: 180,
    paramspiderWorkers: 1,

    // --- jsluice: light extraction ---
    jsluiceEnabled: true,
    jsluiceMaxFiles: 20,

    // --- DISABLE JS Recon ---
    jsReconEnabled: false,

    aiSurfaceReconEnabled: false,
    // --- DISABLE directory fuzzing ---
    ffufEnabled: false,

    // --- DISABLE API discovery ---
    kiterunnerEnabled: false,

    // --- Arjun: passive mode only ---
    arjunEnabled: true,
    arjunPassive: true,

    // --- Nuclei: throttled, critical/high only, no intrusive ---
    nucleiEnabled: true,
    nucleiSeverity: ['critical', 'high'],
    nucleiRateLimit: 5,
    nucleiConcurrency: 2,
    nucleiBulkSize: 5,
    nucleiDastMode: false,
    nucleiHeadless: false,
    nucleiInteractsh: false,
    nucleiScanAllIps: false,
    nucleiExcludeTags: ['dos', 'fuzz', 'intrusive', 'sqli', 'rce'],

    // --- VHost & SNI: explicitly disabled — 2300+ probes through Tor would be both
    //     catastrophically slow AND noisy in Tor exit-node logs ---
    vhostSniEnabled: false,

    // --- Subdomain Takeover: passive DNS-only (subjack), disable active Nuclei templates ---
    subdomainTakeoverEnabled: true,
    subjackEnabled: true,
    subjackAll: false,           // CNAME-identified only — avoids probing every host
    subjackCheckNs: true,        // Pure DNS, safe
    subjackCheckMail: true,      // Pure DNS, safe
    subjackThreads: 3,
    nucleiTakeoversEnabled: false, // No active HTTP fingerprint probes in stealth
    takeoverRateLimit: 10,

    // --- GraphQL: we set graphqlSecurityEnabled: false below for clean preset-switch
    //     state, but note that apply_stealth_overrides (project_settings.py) FORCES
    //     GRAPHQL_SECURITY_ENABLED = True at runtime whenever stealthMode is on,
    //     restricted to passive introspection only (no mutations, no proxy testing,
    //     safe-mode on, rate 2, concurrency 1). DoS graphql-cop probes are also
    //     force-disabled. So the effective GraphQL behaviour is passive-only. ---

    // --- DISABLE security checks ---
    securityCheckEnabled: false,

    // --- CVE lookup ---
    cveLookupEnabled: true,
    cveLookupMaxCves: 50,
    cveLookupMinCvss: 0.0,

    // --- MITRE enrichment ---
    mitreEnabled: true,
    mitreAutoUpdateDb: true,
    mitreIncludeCwe: true,
    mitreIncludeCapec: true,
    mitreEnrichRecon: true,

    // --- OSINT: all enabled at reduced limits ---
    osintEnrichmentEnabled: true,

    shodanEnabled: true,
    shodanHostLookup: true,
    shodanReverseDns: true,
    shodanDomainDns: true,
    shodanPassiveCves: true,
    shodanWorkers: 1,

    urlscanEnabled: true,
    urlscanMaxResults: 1000,

    otxEnabled: true,

    censysEnabled: true,

    fofaEnabled: true,
    fofaMaxResults: 500,

    netlasEnabled: true,

    virusTotalEnabled: true,

    zoomEyeEnabled: true,
    zoomEyeMaxResults: 500,

    criminalIpEnabled: true,

    uncoverEnabled: true,
    uncoverMaxResults: 200,

    // --- GraphQL: explicit OFF so switching from a GraphQL-enabled preset resets cleanly ---
    graphqlSecurityEnabled: false,
    graphqlCopEnabled: false,
  },
}
